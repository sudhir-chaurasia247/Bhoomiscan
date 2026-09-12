const LandRecord = require("../models/LandRecord");
const OCRResult = require("../models/OCRResult");
const { FIELD_LABELS } = require("../models/LandRecord");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/response");
const { serializeRecordDetail, serializeRecordRow } = require("../utils/serializers");
const pipelineService = require("../services/pipelineService");
const auditService = require("../services/auditService");
const logger = require("../utils/logger");

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(value);

/** Accepts either the Mongo id or the human `BSR-YYYY-NNNN` record id used by the UI. */
async function findRecord(idOrCode) {
  const query = isObjectId(idOrCode) ? { _id: idOrCode } : { recordId: idOrCode };

  const record = await LandRecord.findOne(query)
    .populate("document")
    .populate("uploadedBy", "email name");

  if (!record) throw ApiError.notFound("Land record not found");

  return record;
}

function assertCanEdit(req, record) {
  if (req.user.role === "admin" || req.user.role === "verifier") return;

  if (record.uploadedBy._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden("You can only modify records you uploaded");
  }

  if (["approved", "rejected"].includes(record.status)) {
    throw ApiError.forbidden(
      "Verified records can no longer be edited by the operator"
    );
  }
}

/** GET /api/records/:id — OCR Result and Review Record pages. */
const getRecord = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.id);

  if (
    req.user.role === "operator" &&
    record.uploadedBy._id.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden(
      "You can only view records you uploaded"
    );
  }

  console.log("DOCUMENT OCR ID:", record.document?.ocrResult);

  const ocrResult = record.document?.ocrResult
    ? await OCRResult.findById(record.document.ocrResult).lean()
    : null;

  return success(res, {
    record: serializeRecordDetail(record, {
      ocrResult,
      document: record.document,
    }),
  });
});

/** PATCH /api/records/:id — "Save Data" / "Save Changes". */
const updateRecord = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.id);

  assertCanEdit(req, record);

  const incoming = req.body.fields;
  const byKey = new Map(record.fields.map((field) => [field.key, field]));

  incoming.forEach(({ key, value }) => {
    const existing = byKey.get(key);

    if (existing) {
      if (existing.value !== value) {
        existing.value = value;
        existing.editedByUser = true;
        existing.confidence = Math.max(existing.confidence, 99);
      }
    } else {
      record.fields.push({
        key,
        label: FIELD_LABELS[key],
        value,
        confidence: 99,
        editedByUser: true,
      });
    }

    record[key] = value;
  });

  await pipelineService.revalidateRecord(record);

  await auditService.record({
    type: "verify",
    action: "record.edited",
    text: `${req.user.email.split("@")[0]} edited ${record.recordId}`,
    actor: req.user,
    landRecord: record._id,
  });

  const ocrResult = record.document?.ocrResult
    ? await OCRResult.findById(record.document.ocrResult).lean()
    : null;

  return success(res, {
    record: serializeRecordDetail(record, {
      ocrResult,
      document: record.document,
    }),
  });
});

/** POST /api/records/:id/submit — "Send For Verification". */
const submitForVerification = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.id);

  assertCanEdit(req, record);

  if (record.status === "pending") {
    throw ApiError.badRequest(
      "Record is already awaiting verification"
    );
  }

  record.status = "pending";
  record.submittedAt = new Date();

  await record.save();

  await auditService.record({
    type: "verify",
    action: "record.submitted",
    text: `${req.user.email.split("@")[0]} submitted ${record.recordId} for verification`,
    actor: req.user,
    landRecord: record._id,
  });

  return success(res, {
    record: serializeRecordRow(record),
    message: "Sent to the verification queue",
  });
});

/** POST /api/records/:id/extract — "Re-run AI Extraction". */
const reExtract = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.id);

  assertCanEdit(req, record);

  pipelineService
    .reExtractRecord(record, req.user)
    .catch((error) =>
      logger.error("Re-extraction failed", error)
    );

  return res.status(202).json({
    success: true,
    data: {
      recordId: record.recordId,
      documentId: record.document._id.toString(),
      message: "AI extraction re-run started",
    },
  });
});

/** GET /api/records/:id/report — validation report for "Download Report". */
const downloadReport = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.id);

  const ocrResult = record.document?.ocrResult
    ? await OCRResult.findById(record.document.ocrResult).lean()
    : null;

  const detail = serializeRecordDetail(record, {
    ocrResult,
    document: record.document,
  });

  const lines = [
    `BhoomiScan AI — Validation Report`,
    `Record: ${detail.id}`,
    `Generated: ${new Date().toISOString()}`,
    `Overall confidence: ${detail.overall}%`,
    `Status: ${detail.status} (priority ${detail.priority})`,
    "",
    "Structured fields",
    ...detail.fields.map(
      (field) =>
        `  - ${field.label}: ${field.value || "—"} (${field.confidence}%)`
    ),
  ];

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${detail.id}-validation-report.txt"`
  );

  return res.send(lines.join("\n"));
});

/** GET /api/records/search — Search Records page. */
const searchRecords = asyncHandler(async (req, res) => {
  const {
    owner,
    khasra,
    survey,
    village,
    district,
    status,
    page,
    limit,
  } = req.validatedQuery;

  const filter = {};

  if (owner) filter.ownerName = new RegExp(owner, "i");
  if (khasra) filter.khasra = new RegExp(khasra, "i");
  if (survey) filter.survey = new RegExp(survey, "i");
  if (village) filter.village = new RegExp(village, "i");
  if (district && district !== "all") filter.district = district;

  if (status && status !== "all") filter.status = status;
  else filter.status = { $ne: "draft" };

  if (req.user.role === "operator") {
    filter.uploadedBy = req.user._id;
  }

  const [records, total] = await Promise.all([
    LandRecord.find(filter)
      .populate("document", "originalName pages")
      .populate("uploadedBy", "email name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    LandRecord.countDocuments(filter),
  ]);

  return paginated(
    res,
    records.map(serializeRecordRow),
    { page, limit, total }
  );
});

module.exports = {
  getRecord,
  updateRecord,
  submitForVerification,
  reExtract,
  downloadReport,
  searchRecords,
  findRecord,
};