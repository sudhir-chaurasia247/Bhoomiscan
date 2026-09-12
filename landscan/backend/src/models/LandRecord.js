const mongoose = require("mongoose");

const RECORD_STATUSES = ["draft", "processing", "pending", "approved", "rejected"];
const PRIORITIES = ["high", "medium", "low"];

/** Keys are exactly the field keys rendered by StructuredDataForm. */
const FIELD_KEYS = [
  "ownerName",
  "fatherName",
  "khasra",
  "survey",
  "village",
  "taluka",
  "district",
  "state",
  "area",
  "year",
];

const FIELD_LABELS = {
  ownerName: "Owner Name",
  fatherName: "Father Name",
  khasra: "Khasra Number",
  survey: "Survey Number",
  village: "Village",
  taluka: "Taluka",
  district: "District",
  state: "State",
  area: "Land Area",
  year: "Record Year",
};

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, enum: FIELD_KEYS, required: true },
    label: { type: String, required: true },
    value: { type: String, default: "" },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    suggestion: { type: String },
    editedByUser: { type: Boolean, default: false },
  },
  { _id: false },
);

const validationIssueSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["error", "warning", "info", "success"], default: "info" },
    message: { type: String, required: true },
    field: { type: String },
  },
  { _id: false },
);

const landRecordSchema = new mongoose.Schema(
  {
    recordId: { type: String, unique: true, index: true },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    ocrResult: { type: mongoose.Schema.Types.ObjectId, ref: "OCRResult" },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ownerName: { type: String, default: "", trim: true, index: true },
    fatherName: { type: String, default: "", trim: true },
    khasra: { type: String, default: "", trim: true, index: true },
    survey: { type: String, default: "", trim: true, index: true },
    village: { type: String, default: "", trim: true, index: true },
    taluka: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true, index: true },
    state: { type: String, default: "Maharashtra", trim: true },
    area: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },

    fields: { type: [fieldSchema], default: [] },
    confidence: { type: Number, default: 0, min: 0, max: 100, index: true },
    ocrConfidence: { type: Number, default: 0 },
    aiConfidence: { type: Number, default: 0 },

    status: { type: String, enum: RECORD_STATUSES, default: "draft", index: true },
    priority: { type: String, enum: PRIORITIES, default: "medium", index: true },

    validation: {
      issues: { type: [validationIssueSchema], default: [] },
      missingFields: { type: [String], default: [] },
      duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "LandRecord" },
      duplicateMessage: { type: String, default: "No duplicate found" },
      suggestedCorrections: {
        type: [
          {
            field: String,
            current: String,
            suggested: String,
            reason: String,
            _id: false,
          },
        ],
        default: [],
      },
      validatedAt: { type: Date },
    },

    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    extractionModel: { type: String },
  },
  { timestamps: true },
);

landRecordSchema.index({ ownerName: "text", khasra: "text", survey: "text", village: "text" });

landRecordSchema.pre("save", async function assignRecordId(next) {
  if (this.recordId) return next();
  const year = new Date().getFullYear();
  const count = await this.constructor.countDocuments({ recordId: new RegExp(`^BSR-${year}-`) });
  this.recordId = `BSR-${year}-${String(1041 + count).padStart(4, "0")}`;
  return next();
});

module.exports = mongoose.model("LandRecord", landRecordSchema);
module.exports.RECORD_STATUSES = RECORD_STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.FIELD_KEYS = FIELD_KEYS;
module.exports.FIELD_LABELS = FIELD_LABELS;
