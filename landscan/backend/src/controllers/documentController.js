const fs = require("fs/promises");
const path = require("path");
const Document = require("../models/Document");
const LandRecord = require("../models/LandRecord");
const OCRResult = require("../models/OCRResult");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, created, paginated } = require("../utils/response");
const { serializeDocument, serializeRecordRow } = require("../utils/serializers");
const pipelineService = require("../services/pipelineService");
const auditService = require("../services/auditService");
const logger = require("../utils/logger");

function scopeToUser(req, filter = {}) {
  // Operators only ever see their own uploads; verifiers and admins see everything.
  if (req.user.role === "operator") return { ...filter, uploadedBy: req.user._id };
  return filter;
}

async function loadDocument(req) {
  const document = await Document.findOne(scopeToUser(req, { _id: req.params.id })).populate(
    "landRecord",
    "recordId",
  );
  if (!document) throw ApiError.notFound("Document not found");
  return document;
}

/** POST /api/documents/upload */
const uploadDocuments = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw ApiError.badRequest("No files were uploaded");

  const { district, taluka, village, year } = req.body;

  const documents = await Document.insertMany(
    req.files.map((file) => ({
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileType: file.mimetype === "application/pdf" ? "pdf" : "image",
      sizeBytes: file.size,
      district,
      taluka,
      village,
      recordYear: year,
      uploadedBy: req.user._id,
      status: "uploaded",
    })),
  );

  await auditService.record({
    type: "upload",
    action: "document.uploaded",
    text: `${req.user.email.split("@")[0]} uploaded ${documents.length} scanned record(s) for ${village || district || "unspecified area"}`,
    actor: req.user,
    ip: req.ip,
  });

  return created(res, { documents: documents.map(serializeDocument) });
});

/** GET /api/documents — My Uploads table. */
const listDocuments = asyncHandler(async (req, res) => {
  const { q, status, page, limit } = req.validatedQuery;

  const recordFilter = {};
  if (status && status !== "all") recordFilter.status = status;
  if (q) {
    recordFilter.$or = [
      { recordId: new RegExp(q, "i") },
      { ownerName: new RegExp(q, "i") },
      { khasra: new RegExp(q, "i") },
      { village: new RegExp(q, "i") },
    ];
  }

  const filter = scopeToUser(req, {});
  const query = LandRecord.find(scopeToUser(req, recordFilter))
    .populate("document")
    .populate("uploadedBy", "email name")
    .sort({ createdAt: -1 });

  const [records, total, pendingDocs] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit).lean({ virtuals: true }),
    LandRecord.countDocuments(scopeToUser(req, recordFilter)),
    // Documents still in the pipeline have no LandRecord yet but must appear in the table.
    page === 1 && (!status || status === "all" || status === "processing")
      ? Document.find({ ...filter, landRecord: { $exists: false } })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()
      : [],
  ]);

  const rows = [
    ...pendingDocs.map((document) => ({
      id: document._id.toString(),
      documentId: document._id.toString(),
      owner: "—",
      khasra: "—",
      village: document.village || "—",
      district: document.district || "—",
      status: document.status === "failed" ? "rejected" : "processing",
      priority: "medium",
      confidence: 0,
      uploadedBy: req.user.email.split("@")[0],
      uploadedOn: new Date(document.createdAt).toISOString().slice(0, 10),
      pages: document.pages,
      fileName: document.originalName,
    })),
    ...records.map((record) => serializeRecordRow(record)),
  ];

  return paginated(res, rows, { page, limit, total: total + pendingDocs.length });
});

/** GET /api/documents/:id */
const getDocument = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);
  return success(res, { document: serializeDocument(document) });
});

/** POST /api/documents/:id/process — kicks off OCR + AI asynchronously. */
const processDocument = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);
  if (document.status === "processing") {
    return success(res, { document: serializeDocument(document), message: "Already processing" });
  }

  document.status = "queued";
  document.progress = { upload: 100, ocr: 0, ai: 0, validation: 0 };
  await document.save();

  // Fire-and-forget: the processing page polls GET /documents/:id/status.
  pipelineService
    .processDocument(document._id, req.user)
    .catch((error) => logger.error("Background processing failed", error));

  return res.status(202).json({
    success: true,
    data: { document: serializeDocument(document), message: "Processing started" },
  });
});

/** GET /api/documents/:id/status — polled by the OCR Processing page. */
const getStatus = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);
  const ocrResult = document.ocrResult ? await OCRResult.findById(document.ocrResult).lean() : null;

  return success(res, {
    id: document._id.toString(),
    status: document.status,
    progress: document.progress,
    error: document.processingError,
    pages: document.pages,
    ocrText: ocrResult?.rawText || "",
    ocrConfidence: ocrResult ? Math.round(ocrResult.confidence) : 0,
    lowConfidenceTokens: ocrResult?.lowConfidenceTokens || [],
    recordId: document.landRecord?.recordId || null,
    landRecordId: document.landRecord?._id?.toString() || null,
    processingMs: document.processingMs,
  });
});

/** GET /api/documents/:id/file — inline preview for DocumentPreview. */
const streamFile = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);
  const absolute = path.resolve(document.filePath);
  await fs.access(absolute).catch(() => {
    throw ApiError.notFound("Stored file is no longer available");
  });
  res.type(document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
  return res.sendFile(absolute);
});

/** DELETE /api/documents/:id */
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await loadDocument(req);
  if (req.user.role === "operator" && document.status === "processing") {
    throw ApiError.badRequest("Cannot delete a document while it is being processed");
  }

  await Promise.all([
    LandRecord.deleteOne({ document: document._id }),
    OCRResult.deleteOne({ document: document._id }),
    fs.rm(document.filePath, { force: true }).catch(() => {}),
  ]);
  await document.deleteOne();

  await auditService.record({
    type: "upload",
    action: "document.deleted",
    text: `${req.user.email.split("@")[0]} deleted ${document.originalName}`,
    actor: req.user,
    ip: req.ip,
  });

  return success(res, { message: "Document deleted" });
});

module.exports = {
  uploadDocuments,
  listDocuments,
  getDocument,
  processDocument,
  getStatus,
  streamFile,
  deleteDocument,
};
