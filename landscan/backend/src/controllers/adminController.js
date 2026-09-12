const crypto = require("crypto");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, created, paginated } = require("../utils/response");
const { serializeUser } = require("../utils/serializers");
const analyticsService = require("../services/analyticsService");
const auditService = require("../services/auditService");

/** GET /api/admin/analytics — Analytics page. */
const getAnalytics = asyncHandler(async (req, res) => {
  const [stats, districts, monthly] = await Promise.all([
    analyticsService.systemStats(),
    analyticsService.districtStats(12),
    analyticsService.monthlyTrend(8),
  ]);

  return success(res, {
    stats,
    districts,
    monthlyUploads: monthly,
    accuracyTrend: monthly.map(({ month, accuracy }) => ({ month, accuracy })),
    verificationTrend: monthly.map(({ month, uploads, verified }) => ({ month, uploads, verified })),
  });
});

/** GET /api/admin/users — User Management table. */
const listUsers = asyncHandler(async (req, res) => {
  const { q, role, status, page, limit } = req.validatedQuery;

  const filter = {};
  if (role && role !== "all") filter.role = role;
  if (status && status !== "all") filter.status = status;
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }];

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  return paginated(res, users.map(serializeUser), { page, limit, total });
});

/** POST /api/admin/users — "Add User" dialog. */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, role, district, password } = req.body;

  if (await User.findOne({ email: email.toLowerCase() })) {
    throw ApiError.conflict("A user with this email already exists");
  }

  // The Add User dialog has no password input; generate one the admin can reset later.
  const generatedPassword = password || crypto.randomBytes(9).toString("base64url");
  const user = await User.create({
    name,
    email,
    role,
    district,
    passwordHash: generatedPassword,
  });

  await auditService.record({
    type: "admin",
    action: "user.created",
    text: `${req.user.name} added ${role} ${name}`,
    actor: req.user,
    metadata: { userId: user._id.toString() },
  });

  return created(res, {
    user: serializeUser(user),
    // Returned once so the admin can hand the credential over; never stored in plain text.
    temporaryPassword: password ? undefined : generatedPassword,
  });
});

/** PATCH /api/admin/users/:id */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  const { name, role, district, office, status, password } = req.body;
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (district !== undefined) user.district = district;
  if (office !== undefined) user.office = office;
  if (status !== undefined) user.status = status;
  if (password) user.passwordHash = password;
  await user.save();

  return success(res, { user: serializeUser(user) });
});

/** PATCH /api/admin/users/:id/status — enable / disable toggle. */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest("You cannot disable your own account");
  }

  user.status = req.body.status;
  if (user.status === "disabled") user.refreshTokens = [];
  await user.save();

  await auditService.record({
    type: "admin",
    action: "user.status",
    text: `${req.user.name} ${user.status === "active" ? "enabled" : "disabled"} ${user.name}`,
    actor: req.user,
    metadata: { userId: user._id.toString() },
  });

  return success(res, { user: serializeUser(user) });
});

module.exports = { getAnalytics, listUsers, createUser, updateUser, toggleUserStatus };
