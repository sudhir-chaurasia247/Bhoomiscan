const mongoose = require("mongoose");

const DOCUMENT_STATUSES = [
  "uploaded",
  "queued",
  "processing",
  "processed",
  "failed",
];

const STAGES = ["upload", "ocr", "ai", "validation"];

const documentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileType: { type: String, enum: ["pdf", "image"], required: true },
    sizeBytes: { type: Number, required: true },
    pages: { type: Number, default: 1 },

    // Metadata captured by the Upload Record form.
    district: { type: String, trim: true, index: true },
    taluka: { type: String, trim: true },
    village: { type: String, trim: true, index: true },
    recordYear: { type: String, trim: true },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: { type: String, enum: DOCUMENT_STATUSES, default: "uploaded", index: true },
    progress: {
      upload: { type: Number, default: 100 },
      ocr: { type: Number, default: 0 },
      ai: { type: Number, default: 0 },
      validation: { type: Number, default: 0 },
    },
    processingError: { type: String },
    processingStartedAt: { type: Date },
    processingCompletedAt: { type: Date },
    processingMs: { type: Number },
    ocrResult: { type: mongoose.Schema.Types.ObjectId, ref: "OCRResult" },
    landRecord: { type: mongoose.Schema.Types.ObjectId, ref: "LandRecord" },
  },
  { timestamps: true },
);

documentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
module.exports.DOCUMENT_STATUSES = DOCUMENT_STATUSES;
module.exports.STAGES = STAGES;
