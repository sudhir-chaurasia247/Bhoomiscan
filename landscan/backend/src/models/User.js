const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["operator", "verifier", "admin"];
const USER_STATUSES = ["active", "disabled"];

const userSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    district: { type: String, default: "State HQ", trim: true },
    office: { type: String, default: "Directorate of Land Records", trim: true },
    status: { type: String, enum: USER_STATUSES, default: "active", index: true },
    lastActiveAt: { type: Date, default: Date.now },
    refreshTokens: { type: [String], default: [], select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  return next();
});

userSchema.pre("save", async function assignCode(next) {
  if (this.code) return next();
  const count = await this.constructor.estimatedDocumentCount();
  this.code = `U-${1001 + count}`;
  return next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** Shape consumed by AuthContext / Navbar / admin user table. */
userSchema.methods.toProfile = function toProfile() {
  return {
    id: this.code,
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    district: this.district,
    office: this.office,
    status: this.status,
    lastActive: this.lastActiveAt,
  };
};

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
module.exports.USER_STATUSES = USER_STATUSES;
