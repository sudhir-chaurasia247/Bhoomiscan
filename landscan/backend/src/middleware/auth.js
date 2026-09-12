const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  return null;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (error) {
    throw ApiError.unauthorized(
      error.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token",
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (user.status !== "active") throw ApiError.forbidden("Account is disabled");

  user.lastActiveAt = new Date();
  await user.updateOne({ lastActiveAt: user.lastActiveAt });

  req.user = user;
  return next();
});

function authorize(...roles) {
  return function guard(req, res, next) {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(" or ")}`));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
