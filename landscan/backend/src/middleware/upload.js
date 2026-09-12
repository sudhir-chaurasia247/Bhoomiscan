const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

fs.mkdirSync(env.uploads.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploads.dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    cb(null, `${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!env.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Upload PDF, JPG, PNG or TIFF.`));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.uploads.maxFileSizeBytes, files: 10 },
});

module.exports = upload;
