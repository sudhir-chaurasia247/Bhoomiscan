const Document = require("../models/Document");
const LandRecord = require("../models/LandRecord");
const OCRResult = require("../models/OCRResult");
const User = require("../models/User");
const Verification = require("../models/Verification");

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthsBack(count) {
  const now = new Date();
  const months = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    months.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      month: MONTH_LABELS[date.getUTCMonth()],
      start: date,
    });
  }
  return months;
}

async function statusCounts(filter = {}) {
  const rows = await LandRecord.aggregate([
    { $match: { ...filter } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return rows.reduce(
    (acc, row) => ({ ...acc, [row._id]: row.count }),
    { draft: 0, processing: 0, pending: 0, approved: 0, rejected: 0 },
  );
}

/** `monthlyUploads` shape: [{ month, uploads, verified, accuracy }] */
async function monthlyTrend(months = 8, filter = {}) {
  const buckets = monthsBack(months);
  const since = buckets[0].start;

  const rows = await LandRecord.aggregate([
    { $match: { ...filter, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        uploads: { $sum: 1 },
        verified: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        accuracy: { $avg: "$confidence" },
      },
    },
  ]);

  const byKey = new Map(rows.map((row) => [row._id, row]));
  return buckets.map((bucket) => {
    const row = byKey.get(bucket.key);
    return {
      month: bucket.month,
      uploads: row?.uploads || 0,
      verified: row?.verified || 0,
      accuracy: Math.round(row?.accuracy || 0),
    };
  });
}

/** `districts` shape: [{ name, records, verified, pending, rejected, accuracy }] */
async function districtStats(limit = 12) {
  const rows = await LandRecord.aggregate([
    { $match: { district: { $nin: ["", null] } } },
    {
      $group: {
        _id: "$district",
        records: { $sum: 1 },
        verified: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        accuracy: { $avg: "$confidence" },
      },
    },
    { $sort: { records: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({
    name: row._id,
    records: row.records,
    verified: row.verified,
    pending: row.pending,
    rejected: row.rejected,
    accuracy: Math.round(row.accuracy || 0),
  }));
}

/** `adminStats` shape rendered by AdminDashboard / Analytics. */
async function systemStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [counts, operators, verifiers, ocrAgg, aiAgg, processedToday, timing, duplicates, total] =
    await Promise.all([
      statusCounts({ status: { $ne: "draft" } }),
      User.countDocuments({ role: "operator" }),
      User.countDocuments({ role: "verifier" }),
      OCRResult.aggregate([{ $group: { _id: null, avg: { $avg: "$confidence" } } }]),
      LandRecord.aggregate([{ $group: { _id: null, avg: { $avg: "$aiConfidence" } } }]),
      Document.countDocuments({ processingCompletedAt: { $gte: startOfToday } }),
      Document.aggregate([
        { $match: { processingMs: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$processingMs" } } },
      ]),
      LandRecord.countDocuments({ "validation.duplicateOf": { $exists: true, $ne: null } }),
      LandRecord.countDocuments({ status: { $ne: "draft" } }),
    ]);

  const verified = counts.approved;
  const avgMs = timing[0]?.avg || 0;

  return {
    totalRecords: total,
    verified,
    pending: counts.pending,
    rejected: counts.rejected,
    operators,
    verifiers,
    ocrAccuracy: Math.round((ocrAgg[0]?.avg || 0) * 10) / 10,
    aiAccuracy: Math.round((aiAgg[0]?.avg || 0) * 10) / 10,
    digitizationProgress: total ? Math.round((verified / total) * 100) : 0,
    avgProcessingTime: avgMs ? `${Math.round(avgMs / 1000)} sec` : "—",
    processedToday,
    duplicateRate: total ? Math.round((duplicates / total) * 1000) / 10 : 0,
    verificationRate: total ? Math.round((verified / total) * 1000) / 10 : 0,
  };
}

async function operatorStats(userId) {
  const filter = { uploadedBy: userId };
  const [counts, total, thisMonth] = await Promise.all([
    statusCounts(filter),
    LandRecord.countDocuments(filter),
    LandRecord.countDocuments({
      ...filter,
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    }),
  ]);

  return {
    totalUploads: total,
    pendingVerification: counts.pending,
    verified: counts.approved,
    rejected: counts.rejected,
    uploadedThisMonth: thisMonth,
  };
}

async function verifierStats(userId) {
  const [pending, highPriority, approved, rejected, timing] = await Promise.all([
    LandRecord.countDocuments({ status: "pending" }),
    LandRecord.countDocuments({ status: "pending", priority: "high" }),
    Verification.countDocuments({ verifier: userId, action: "approved" }),
    Verification.countDocuments({ verifier: userId, action: "rejected" }),
    Verification.aggregate([
      { $match: { verifier: userId, reviewDurationMs: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$reviewDurationMs" } } },
    ]),
  ]);

  const avgMs = timing[0]?.avg || 0;
  const minutes = Math.floor(avgMs / 60000);
  const seconds = Math.round((avgMs % 60000) / 1000);

  return {
    pendingInQueue: pending,
    highPriority,
    approvedByYou: approved,
    rejectedByYou: rejected,
    rejectionRate: approved + rejected ? Math.round((rejected / (approved + rejected)) * 1000) / 10 : 0,
    avgReviewTime: avgMs ? `${minutes}m ${seconds}s` : "—",
  };
}

module.exports = {
  statusCounts,
  monthlyTrend,
  districtStats,
  systemStats,
  operatorStats,
  verifierStats,
};
