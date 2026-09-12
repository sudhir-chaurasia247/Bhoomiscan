const ApiError = require("../utils/ApiError");

/**
 * Validates `req[source]` against a zod schema and replaces it with the parsed value.
 */
function validate(schema, source = "body") {
  return function runValidation(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(ApiError.badRequest("Validation failed", details));
    }
    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

module.exports = validate;
