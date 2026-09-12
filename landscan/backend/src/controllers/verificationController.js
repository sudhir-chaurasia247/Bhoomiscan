const LandRecord = require("../models/LandRecord");
const Verification = require("../models/Verification");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/response");
const { serializeRecordRow } = require("../utils/serializers");
const { findRecord } = require("./recordController");
const pipelineService = require("../services/pipelineService");
const auditService = require("../services/auditService");
const logger = require("../utils/logger");

const CONFIDENCE_RANGES = {
  high: { $gte: 90 },
  medium: { $gte: 80, $lt: 90 },
  low: { $lt: 80 },
};

/** GET /api/verification/queue */
const getQueue = asyncHandler(async (req, res) => {
  const { q, priority, confidence, district, page, limit } = req.validatedQuery;

  const filter = { status: "pending" };
  if (priority && priority !== "all") filter.priority = priority;
  if (confidence && confidence !== "all") filter.confidence = CONFIDENCE_RANGES[confidence];
  if (district && district !== "all") filter.district = district;
  if (q) {
    filter.$or = [
      { recordId: new RegExp(q, "i") },
      { ownerName: new RegExp(q, "i") },
      { khasra: new RegExp(q, "i") },
      { village: new RegExp(q, "i") },
    ];
  }

  const [records, total] = await Promise.all([
    LandRecord.find(filter)
      .populate("document", "originalName pages")
      .populate("uploadedBy", "email name")
      // Lowest confidence first — that ordering matches the "priority" the UI shows.
      .sort({ confidence: 1, submittedAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LandRecord.countDocuments(filter),
  ]);

  return paginated(res, records.map(serializeRecordRow), { page, limit, total });
});

async function decide(req, action) {
  const record = await findRecord(req.params.recordId);
  if (record.status !== "pending") {
    throw ApiError.badRequest(`Record is ${record.status} and is not awaiting verification`);
  }

  const status = action === "approved" ? "approved" : "rejected";
  record.status = status;
  record.verifiedAt = new Date();
  record.verifiedBy = req.user._id;
  await record.save();

  const verification = await Verification.create({
    landRecord: record._id,
    verifier: req.user._id,
    action,
    comments: req.body.comments || "",
    fieldsSnapshot: record.fields.map((field) => ({
      key: field.key,
      value: field.value,
      confidence: field.confidence,
    })),
    confidenceAtReview: record.confidence,
    reviewDurationMs: record.submittedAt ? Date.now() - new Date(record.submittedAt).getTime() : undefined,
  });

  await auditService.record({
    type: "verify",
    action: `record.${status}`,
    text: `${req.user.email.split("@")[0]} ${status} ${record.recordId}${
      req.body.comments ? ` (${req.body.comments})` : ""
    }`,
    actor: req.user,
    landRecord: record._id,
  });

  return { record, verification };
}

/** POST /api/verification/:recordId/approve */
const approve = asyncHandler(async (req, res) => {
  const { record } = await decide(req, "approved");
  return success(res, {
    record: serializeRecordRow(record),
    message: "Record approved and pushed to the verified registry.",
  });
});

/** POST /api/verification/:recordId/reject */
const reject = asyncHandler(async (req, res) => {
  if (!req.body.comments) throw ApiError.badRequest("A rejection reason is required");
  const { record } = await decide(req, "rejected");
  return success(res, {
    record: serializeRecordRow(record),
    message: "Record rejected. Operator has been notified.",
  });
});

/** POST /api/verification/:recordId/reprocess — "Request Reprocessing". */
const requestReprocess = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.recordId);

  record.status = "processing";
  await record.save();

  await Verification.create({
    landRecord: record._id,
    verifier: req.user._id,
    action: "reprocess_requested",
    comments: req.body.comments || "",
    confidenceAtReview: record.confidence,
  });

  pipelineService
    .reprocessDocument(record.document._id, req.user)
    .catch((error) => logger.error("Reprocessing failed", error));

  await auditService.record({
    type: "ocr",
    action: "record.reprocess",
    text: `${req.user.email.split("@")[0]} requested reprocessing of ${record.recordId}`,
    actor: req.user,
    landRecord: record._id,
  });

  return res.status(202).json({
    success: true,
    data: { message: "Reprocessing requested from the OCR pipeline." },
  });
});
 const getRecord = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.recordId);

  await record.populate("document");
  await record.populate("uploadedBy", "name email");

  return success(res, {
    record: {
      id: record._id,
      recordId: record.recordId,
      ownerName: record.ownerName,
      khasra: record.khasra,
      village: record.village,
      district: record.district,
      confidence: record.confidence,
      priority: record.priority,
      status: record.status,
      fields: record.fields || [],
      ocrText: record.ocrText || "",
      uploadedBy: record.uploadedBy,
      document: record.document,
      submittedAt: record.submittedAt,
    },
  });
});
/** GET /api/verification/:recordId/history */
const getHistory = asyncHandler(async (req, res) => {
  const record = await findRecord(req.params.recordId);
  const history = await Verification.find({ landRecord: record._id })
    .populate("verifier", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return success(res, {
    history: history.map((entry) => ({
      id: entry._id.toString(),
      action: entry.action,
      comments: entry.comments,
      verifier: entry.verifier?.name,
      at: entry.createdAt,
    })),
  });
});

module.exports = {
  getQueue,
  getRecord,
  approve,
  reject,
  requestReprocess,
  getHistory,
};
