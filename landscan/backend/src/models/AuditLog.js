const mongoose = require("mongoose");

/** `type` maps directly to the icon set used by the dashboard activity feeds. */
const AUDIT_TYPES = ["upload", "ocr", "verify", "auth", "admin"];

const auditLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: AUDIT_TYPES, required: true, index: true },
    action: { type: String, required: true },
    text: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorLabel: { type: String },
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    landRecord: { type: mongoose.Schema.Types.ObjectId, ref: "LandRecord" },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.AUDIT_TYPES = AUDIT_TYPES;
