const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

/**
 * Audit writes must never break the request they describe, so failures are logged and swallowed.
 */
async function record({ type, action, text, actor, document, landRecord, metadata, ip }) {
  try {
    await AuditLog.create({
      type,
      action,
      text,
      actor: actor?._id,
      actorLabel: actor ? actor.email.split("@")[0] : undefined,
      document,
      landRecord,
      metadata,
      ip,
    });
  } catch (error) {
    logger.warn("Failed to write audit log", error);
  }
}

function listRecent(filter = {}, limit = 10) {
  return AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = { record, listRecent };
