const mongoose = require("mongoose");

const VERIFICATION_ACTIONS = ["approved", "rejected", "reprocess_requested", "edited"];

const verificationSchema = new mongoose.Schema(
  {
    landRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LandRecord",
      required: true,
      index: true,
    },
    verifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: { type: String, enum: VERIFICATION_ACTIONS, required: true, index: true },
    comments: { type: String, default: "" },
    /** Snapshot of field values at decision time, for the audit trail. */
    fieldsSnapshot: {
      type: [
        {
          key: String,
          value: String,
          confidence: Number,
          _id: false,
        },
      ],
      default: [],
    },
    confidenceAtReview: { type: Number },
    reviewDurationMs: { type: Number },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Verification", verificationSchema);
module.exports.VERIFICATION_ACTIONS = VERIFICATION_ACTIONS;
