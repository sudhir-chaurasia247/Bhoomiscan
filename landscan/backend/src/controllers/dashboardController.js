const LandRecord = require("../models/LandRecord");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const { serializeRecordRow, serializeAudit } = require("../utils/serializers");
const analyticsService = require("../services/analyticsService");
const auditService = require("../services/auditService");

/** GET /api/dashboard/operator */
const operatorDashboard = asyncHandler(async (req, res) => {
  const [stats, recent, activity] = await Promise.all([
    analyticsService.operatorStats(req.user._id),
    LandRecord.find({ uploadedBy: req.user._id })
      .populate("document", "originalName pages")
      .populate("uploadedBy", "email name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    auditService.listRecent({ actor: req.user._id }, 6),
  ]);

  return success(res, {
    stats,
    recentUploads: recent.map(serializeRecordRow),
    activity: activity.map(serializeAudit),
  });
});

/** GET /api/dashboard/verifier */
const verifierDashboard = asyncHandler(async (req, res) => {
  const [stats, queue, activity] = await Promise.all([
    analyticsService.verifierStats(req.user._id),
    LandRecord.find({ status: "pending" })
      .populate("document", "originalName pages")
      .populate("uploadedBy", "email name")
      .sort({ confidence: 1, submittedAt: 1 })
      .limit(5)
      .lean(),
    auditService.listRecent({ type: "verify" }, 6),
  ]);

  return success(res, {
    stats,
    queuePreview: queue.map(serializeRecordRow),
    activity: activity.map(serializeAudit),
  });
});

/** GET /api/dashboard/admin */
const adminDashboard = asyncHandler(async (req, res) => {
  const [stats, districts, monthly, activity] = await Promise.all([
    analyticsService.systemStats(),
    analyticsService.districtStats(6),
    analyticsService.monthlyTrend(8),
    auditService.listRecent({}, 8),
  ]);

  return success(res, {
    stats,
    districts,
    monthlyUploads: monthly,
    activity: activity.map(serializeAudit),
  });
});

module.exports = { operatorDashboard, verifierDashboard, adminDashboard };
