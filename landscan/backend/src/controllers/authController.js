const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { success, created } = require("../utils/response");
const { serializeUser } = require("../utils/serializers");
const tokenService = require("../services/tokenService");
const auditService = require("../services/auditService");

async function issueSession(user, res) {
  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = tokenService.signRefreshToken(user);

  await User.updateOne(
    { _id: user._id },
    { $push: { refreshTokens: { $each: [refreshToken], $slice: -5 } }, $set: { lastActiveAt: new Date() } },
  );

  res.cookie("refreshToken", refreshToken, tokenService.refreshCookieOptions());
  return { accessToken, refreshToken };
}

/** POST /api/auth/register — admin only; mirrors the "Add User" form. */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, district } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("A user with this email already exists");

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
    district,
  });

  await auditService.record({
    type: "admin",
    action: "user.created",
    text: `${req.user.email.split("@")[0]} created ${role} account for ${email}`,
    actor: req.user,
    ip: req.ip,
  });

  return created(res, { user: serializeUser(user) });
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized("Invalid email or password");
  if (user.status !== "active") throw ApiError.forbidden("Account is disabled. Contact an administrator.");
  if (role && role !== user.role) {
    throw ApiError.forbidden(`This account is registered as ${user.role}, not ${role}.`);
  }

  const tokens = await issueSession(user, res);

  await auditService.record({
    type: "auth",
    action: "auth.login",
    text: `${user.email.split("@")[0]} signed in as ${user.role}`,
    actor: user,
    ip: req.ip,
  });

  return success(res, { user: serializeUser(user), ...tokens });
});

/** POST /api/auth/refresh */
const refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized("Refresh token missing");

  let payload;
  try {
    payload = tokenService.verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub).select("+refreshTokens");
  if (!user || !user.refreshTokens.includes(token)) {
    throw ApiError.unauthorized("Refresh token has been revoked");
  }
  if (user.status !== "active") throw ApiError.forbidden("Account is disabled");

  await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: token } });
  const tokens = await issueSession(user, res);

  return success(res, { user: serializeUser(user), ...tokens });
});

/** GET /api/auth/me — used to re-hydrate AuthContext on app boot. */
const me = asyncHandler(async (req, res) => success(res, { user: serializeUser(req.user) }));

/** POST /api/auth/logout */
const logout = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (token) {
    await User.updateOne({ refreshTokens: token }, { $pull: { refreshTokens: token } });
  }
  res.clearCookie("refreshToken", { ...tokenService.refreshCookieOptions(), maxAge: undefined });
  return success(res, { message: "Logged out" });
});

module.exports = { register, login, refresh, me, logout };
