const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    message: { type: String, required: true },
    level: { type: String, enum: ["info", "warn", "error"], default: "info" },
    at: { type: Date, default: Date.now },
    durationMs: { type: Number },
  },
  { _id: false },
);

const ocrResultSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    engine: { type: String, default: "tesseract.js" },
    languages: { type: String, default: "eng" },
    rawText: { type: String, default: "" },
    pageTexts: { type: [String], default: [] },
    confidence: { type: Number, default: 0 },
    /** Tokens rendered as <mark> by OcrTextPanel. */
    lowConfidenceTokens: { type: [String], default: [] },
    words: {
      type: [
        {
          text: String,
          confidence: Number,
          page: Number,
          _id: false,
        },
      ],
      default: [],
    },
    processingMs: { type: Number, default: 0 },
    logs: { type: [logSchema], default: [] },
    attempt: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OCRResult", ocrResultSchema);
