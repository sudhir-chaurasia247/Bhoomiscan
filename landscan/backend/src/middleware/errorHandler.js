const multer = require("multer");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  let normalized = error;

  if (error instanceof multer.MulterError) {
    normalized =
      error.code === "LIMIT_FILE_SIZE"
        ? ApiError.payloadTooLarge(
            `File exceeds the ${env.uploads.maxFileSizeBytes / (1024 * 1024)} MB limit`,
          )
        : ApiError.badRequest(error.message);
  } else if (error.name === "ValidationError") {
    normalized = ApiError.badRequest("Validation failed", Object.values(error.errors).map((e) => e.message));
  } else if (error.name === "CastError") {
    normalized = ApiError.badRequest(`Invalid identifier: ${error.value}`);
  } else if (error.code === 11000) {
    normalized = ApiError.conflict(`Duplicate value for ${Object.keys(error.keyValue).join(", ")}`);
  } else if (!(error instanceof ApiError)) {
    normalized = ApiError.internal(error.message);
  }

  if (normalized.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, error);
  }

  res.status(normalized.statusCode).json({
    success: false,
    error: {
      message: normalized.statusCode >= 500 && env.isProduction
        ? "Internal server error"
        : normalized.message,
      details: normalized.details,
      ...(env.isProduction ? {} : { stack: error.stack }),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
