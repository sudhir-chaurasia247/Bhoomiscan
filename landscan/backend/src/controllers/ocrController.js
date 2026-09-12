const Document = require("../models/Document");
const OCRResult = require("../models/OCRResult");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const pipelineService = require("../services/pipelineService");
const auditService = require("../services/auditService");
const logger = require("../utils/logger");

async function loadDocument(req) {
  const filter = { _id: req.params.documentId };
  if (req.user.role === "operator") filter.uploadedBy = req.user._id;
  const document = await Document.findOne(filter);
  if (!document) throw ApiError.notFound("Document not found");
  return document;
}

/** GET /api/ocr/:documentId — raw text panel + processing logs. */
const getOcrResult = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);
  const ocrResult = await OCRResult.findOne({ document: document._id }).lean();
  if (!ocrResult) throw ApiError.notFound("OCR has not been run for this document yet");

  return success(res, {
    documentId: document._id.toString(),
    text: ocrResult.rawText,
    pageTexts: ocrResult.pageTexts,
    confidence: Math.round(ocrResult.confidence),
    lowConfidenceTokens: ocrResult.lowConfidenceTokens,
    engine: ocrResult.engine,
    languages: ocrResult.languages,
    processingMs: ocrResult.processingMs,
    logs: ocrResult.logs,
  });
});

/** POST /api/ocr/:documentId/rerun — "Re-run OCR" button. */
const rerunOcr = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);

  pipelineService
    .reprocessDocument(document._id, req.user)
    .catch((error) => logger.error("OCR rerun failed", error));

  await auditService.record({
    type: "ocr",
    action: "ocr.rerun",
    text: `OCR re-run queued for ${document.originalName}`,
    actor: req.user,
    document: document._id,
  });

  return res.status(202).json({
    success: true,
    data: { documentId: document._id.toString(), message: "OCR re-run queued" },
  });
});

module.exports = { getOcrResult, rerunOcr };
