const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env.`,
  );
}

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: toInt(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX || "/api",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:8081")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  uploads: {
    dir: path.resolve(__dirname, "../../", process.env.UPLOAD_DIR || "uploads"),
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 25) * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
      "image/webp",
    ],
  },
  ocr: {
    langs: process.env.TESSERACT_LANGS || "eng",
    cacheDir: path.resolve(__dirname, "../../", process.env.TESSERACT_CACHE_DIR || ".tesseract-cache"),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  },
  thresholds: {
    lowConfidenceField: toInt(process.env.LOW_CONFIDENCE_FIELD_THRESHOLD, 78),
    lowConfidenceRecord: toInt(process.env.LOW_CONFIDENCE_RECORD_THRESHOLD, 80),
    autoVerify: toInt(process.env.AUTO_VERIFY_THRESHOLD, 95),
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || "admin.meera@gov.in",
    adminPassword: process.env.SEED_ADMIN_PASSWORD || "demo1234",
  },
};

module.exports = env;
