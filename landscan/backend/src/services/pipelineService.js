const Document = require("../models/Document");
const OCRResult = require("../models/OCRResult");
const LandRecord = require("../models/LandRecord");
const ocrService = require("./ocrService");
const geminiService = require("./geminiService");
const validationService = require("./validationService");
const auditService = require("./auditService");
const logger = require("../utils/logger");

/** Documents currently being processed, so a second /process call is a no-op. */
const inFlight = new Set();

function setStage(documentId, patch) {
  return Document.updateOne({ _id: documentId }, { $set: patch });
}

async function runOcrStage(document) {
  const ocrData = await ocrService.runOcr(document, async (percent) => {
    await setStage(document._id, { "progress.ocr": Math.min(99, percent) });
  });

  const ocrResult = await OCRResult.findOneAndUpdate(
    { document: document._id },
    {
      document: document._id,
      engine: ocrData.engine,
      languages: ocrData.languages,
      rawText: ocrData.rawText,
      pageTexts: ocrData.pageTexts,
      confidence: ocrData.confidence,
      lowConfidenceTokens: ocrData.lowConfidenceTokens,
      words: ocrData.words,
      processingMs: ocrData.processingMs,
      logs: ocrData.logs,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await setStage(document._id, {
    "progress.ocr": 100,
    pages: ocrData.pages || document.pages,
    ocrResult: ocrResult._id,
  });

  return ocrResult;
}

async function runExtractionStage(document, ocrResult) {
  const { values, confidence, model } = await geminiService.extractStructuredRecord(ocrResult.rawText, {
    district: document.district,
    taluka: document.taluka,
    village: document.village,
    year: document.recordYear,
  });

  // Operator-entered metadata fills gaps the model could not read.
  const merged = {
    ...values,
    district: values.district || document.district || "",
    taluka: values.taluka || document.taluka || "",
    village: values.village || document.village || "",
    year: values.year || document.recordYear || "",
  };

  const fields = geminiService.buildFields(merged, confidence, ocrResult.words);
  await setStage(document._id, { "progress.ai": 100 });
  return { fields, model };
}

async function runValidationStage({ document, ocrResult, fields, model, existingRecord }) {
  const outcome = await validationService.validateRecord({
    fields,
    ocrConfidence: ocrResult.confidence,
    excludeId: existingRecord?._id,
  });

  const values = Object.fromEntries(fields.map((field) => [field.key, field.value]));
  const payload = {
    document: document._id,
    ocrResult: ocrResult._id,
    uploadedBy: document.uploadedBy,
    ownerName: values.ownerName,
    fatherName: values.fatherName,
    khasra: values.khasra,
    survey: values.survey,
    village: values.village,
    taluka: values.taluka,
    district: values.district,
    state: values.state || "Maharashtra",
    area: values.area,
    year: values.year,
    fields,
    confidence: outcome.confidence,
    ocrConfidence: Math.round(ocrResult.confidence),
    aiConfidence: Math.round(
      fields.reduce((sum, field) => sum + field.confidence, 0) / (fields.length || 1),
    ),
    priority: outcome.priority,
    validation: outcome.validation,
    extractionModel: model,
    status: "pending",
  };

  const record = existingRecord
    ? Object.assign(existingRecord, payload)
    : new LandRecord(payload);
  await record.save();

  await setStage(document._id, { "progress.validation": 100, landRecord: record._id });
  return record;
}

/**
 * Runs the full OCR → Gemini → validation pipeline for a document.
 * Errors are persisted on the document so the processing page can surface them.
 */
async function processDocument(documentId, actor) {
  const key = documentId.toString();
  if (inFlight.has(key)) return null;
  inFlight.add(key);

  const startedAt = Date.now();
  try {
    const document = await Document.findById(documentId);
    if (!document) throw new Error("Document not found");

    await setStage(document._id, {
      status: "processing",
      processingStartedAt: new Date(),
      processingError: null,
      "progress.upload": 100,
      "progress.ocr": 0,
      "progress.ai": 0,
      "progress.validation": 0,
    });

    const ocrResult = await runOcrStage(document);
    await auditService.record({
      type: "ocr",
      action: "ocr.completed",
      text: `OCR completed on ${document.originalName} with ${Math.round(ocrResult.confidence)}% confidence`,
      actor,
      document: document._id,
    });

    const { fields, model } = await runExtractionStage(document, ocrResult);
    const existingRecord = document.landRecord
      ? await LandRecord.findById(document.landRecord)
      : null;
    const record = await runValidationStage({ document, ocrResult, fields, model, existingRecord });

    await setStage(document._id, {
      status: "processed",
      processingCompletedAt: new Date(),
      processingMs: Date.now() - startedAt,
    });

    await auditService.record({
      type: "ocr",
      action: "extraction.completed",
      text: `AI extraction produced ${record.recordId} at ${record.confidence}% confidence`,
      actor,
      document: document._id,
      landRecord: record._id,
    });

    return record;
  } catch (error) {
    logger.error(`Pipeline failed for document ${documentId}`, error);
    await setStage(documentId, {
      status: "failed",
      processingError: error.message,
      processingCompletedAt: new Date(),
    });
    throw error;
  } finally {
    inFlight.delete(key);
  }
}

/** Re-runs only OCR (and the downstream stages), used by "Re-run OCR". */
async function reprocessDocument(documentId, actor) {
  await setStage(documentId, {
    status: "queued",
    "progress.ocr": 0,
    "progress.ai": 0,
    "progress.validation": 0,
  });
  return processDocument(documentId, actor);
}

/** Re-runs Gemini extraction + validation against the existing OCR text. */
async function reExtractRecord(record, actor) {
  const document = await Document.findById(record.document);
  const ocrResult = await OCRResult.findById(record.ocrResult);
  if (!document || !ocrResult) throw new Error("OCR result is not available for this record");

  await setStage(document._id, { "progress.ai": 0, "progress.validation": 0 });
  const { fields, model } = await runExtractionStage(document, ocrResult);
  const updated = await runValidationStage({
    document,
    ocrResult,
    fields,
    model,
    existingRecord: record,
  });

  await auditService.record({
    type: "ocr",
    action: "extraction.rerun",
    text: `AI extraction re-run for ${updated.recordId}`,
    actor,
    document: document._id,
    landRecord: updated._id,
  });

  return updated;
}

/** Re-validates after manual edits without touching OCR or Gemini. */
async function revalidateRecord(record) {
  const outcome = await validationService.validateRecord({
    fields: record.fields,
    ocrConfidence: record.ocrConfidence,
    excludeId: record._id,
  });
  record.confidence = outcome.confidence;
  record.priority = outcome.priority;
  record.validation = outcome.validation;
  await record.save();
  return record;
}

module.exports = {
  processDocument,
  reprocessDocument,
  reExtractRecord,
  revalidateRecord,
};
