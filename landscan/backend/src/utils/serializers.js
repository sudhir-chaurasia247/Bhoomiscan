const { FIELD_KEYS, FIELD_LABELS } = require("../models/LandRecord");

const toDateOnly = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

function serializeFields(record) {
  if (record.fields && record.fields.length) {
    return record.fields.map((field) => ({
      key: field.key,
      label: field.label || FIELD_LABELS[field.key],
      value: field.value || "",
      confidence: Math.round(field.confidence || 0),
    }));
  }
  return FIELD_KEYS.map((key) => ({
    key,
    label: FIELD_LABELS[key],
    value: record[key] || "",
    confidence: Math.round(record.confidence || 0),
  }));
}

/** Row shape consumed by DataTable on My Uploads / queue / search pages. */
function serializeRecordRow(record) {
  const document = record.document && record.document._id ? record.document : null;
  const uploader = record.uploadedBy && record.uploadedBy._id ? record.uploadedBy : null;

  return {
    id: record.recordId,
    _id: record._id.toString(),
    documentId: document ? document._id.toString() : record.document?.toString(),
    owner: record.ownerName,
    fatherName: record.fatherName,
    khasra: record.khasra,
    survey: record.survey,
    village: record.village,
    taluka: record.taluka,
    district: record.district,
    state: record.state,
    area: record.area,
    year: record.year,
    status: record.status,
    priority: record.priority,
    confidence: Math.round(record.confidence || 0),
    uploadedBy: uploader ? uploader.email.split("@")[0] : undefined,
    uploadedOn: toDateOnly(record.createdAt),
    pages: document ? document.pages : undefined,
    fileName: document ? document.originalName : undefined,
  };
}

/** Full payload for OCR Result / Review Record pages. */
function serializeRecordDetail(record, { ocrResult, document } = {}) {
  const fields = serializeFields(record);
  const overall =
    fields.length > 0
      ? Math.round(fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length)
      : Math.round(record.confidence || 0);

  return {
    ...serializeRecordRow(record),
    fields,
    overall,
    ocr: ocrResult
      ? {
          text: ocrResult.rawText,
          confidence: Math.round(ocrResult.confidence || 0),
          lowConfidenceTokens: ocrResult.lowConfidenceTokens,
          engine: ocrResult.engine,
          processingMs: ocrResult.processingMs,
          logs: ocrResult.logs,
        }
      : null,
    validation: {
      overall,
      warnings: (record.validation?.issues || []).map((issue) => ({
        type: issue.type,
        message: issue.message,
        field: issue.field,
      })),
      missing: record.validation?.missingFields || [],
      duplicate: record.validation?.duplicateMessage || "No duplicate found",
      suggestedCorrections: record.validation?.suggestedCorrections || [],
    },
    document: document
      ? {
          id: document._id.toString(),
          fileName: document.originalName,
          fileType: document.fileType,
          mimeType: document.mimeType,
          pages: document.pages,
          sizeBytes: document.sizeBytes,
          url: `/uploads/${document.fileName}`,
          status: document.status,
          progress: document.progress,
        }
      : null,
    extractionModel: record.extractionModel,
    submittedAt: record.submittedAt,
    verifiedAt: record.verifiedAt,
  };
}

function serializeDocument(document) {
  return {
    id: document._id.toString(),
    fileName: document.originalName,
    storedName: document.fileName,
    fileType: document.fileType,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    pages: document.pages,
    district: document.district,
    taluka: document.taluka,
    village: document.village,
    year: document.recordYear,
    status: document.status,
    progress: document.progress,
    url: `/uploads/${document.fileName}`,
    uploadedOn: toDateOnly(document.createdAt),
    recordId: document.landRecord?.recordId || null,
  };
}

const RELATIVE_UNITS = [
  [60, "sec"],
  [3600, "min"],
  [86400, "hr"],
];

function relativeTime(date) {
  if (!date) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < RELATIVE_UNITS[0][0]) return "Just now";
  if (seconds < RELATIVE_UNITS[1][0]) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < RELATIVE_UNITS[2][0]) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function serializeUser(user) {
  const profile = user.toProfile ? user.toProfile() : user;
  return { ...profile, lastActive: relativeTime(profile.lastActive) };
}

function serializeAudit(entry) {
  return {
    type: entry.type === "auth" || entry.type === "admin" ? "upload" : entry.type,
    text: entry.text,
    time: relativeTime(entry.createdAt),
  };
}

module.exports = {
  serializeFields,
  serializeRecordRow,
  serializeRecordDetail,
  serializeDocument,
  serializeUser,
  serializeAudit,
  relativeTime,
  toDateOnly,
};
