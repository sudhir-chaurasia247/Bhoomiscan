const LandRecord = require("../models/LandRecord");
const OCRResult = require("../models/OCRResult");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const { relativeTime } = require("../utils/serializers");
const analyticsService = require("../services/analyticsService");

/**
 * GET /api/notifications
 * Derived from live counters rather than a stored collection — the header bell
 * only renders `{ title, detail, time }` items.
 */
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = [];

  if (req.user.role === "verifier" || req.user.role === "admin") {
    const pending = await LandRecord.countDocuments({ status: "pending" });
    if (pending) {
      const latest = await LandRecord.findOne({ status: "pending" }).sort({ submittedAt: -1 }).lean();
      notifications.push({
        title: `${pending} record${pending > 1 ? "s" : ""} awaiting review`,
        detail: "Verification queue updated",
        time: relativeTime(latest?.submittedAt || latest?.updatedAt),
      });
    }
  }

  if (req.user.role === "operator") {
    const [rejected, approved] = await Promise.all([
      LandRecord.countDocuments({ uploadedBy: req.user._id, status: "rejected" }),
      LandRecord.countDocuments({ uploadedBy: req.user._id, status: "approved" }),
    ]);
    if (rejected) {
      notifications.push({
        title: `${rejected} record${rejected > 1 ? "s" : ""} rejected`,
        detail: "Open My Uploads to correct and resubmit",
        time: "",
      });
    }
    if (approved) {
      notifications.push({
        title: `${approved} of your records verified`,
        detail: "Published to the state registry",
        time: "",
      });
    }
  }

  const [latestOcr] = await OCRResult.find().sort({ createdAt: -1 }).limit(1).lean();
  if (latestOcr) {
    notifications.push({
      title: `OCR engine health: ${latestOcr.confidence >= 80 ? "normal" : "degraded"}`,
      detail: `Average latency ${(latestOcr.processingMs / 1000).toFixed(1)}s / document`,
      time: relativeTime(latestOcr.createdAt),
    });
  }

  if (req.user.role === "admin") {
    const stats = await analyticsService.systemStats();
    notifications.push({
      title: `Digitization progress ${stats.digitizationProgress}%`,
      detail: "State dashboard",
      time: "",
    });
  }

  return success(res, { notifications });
});

module.exports = { listNotifications };
