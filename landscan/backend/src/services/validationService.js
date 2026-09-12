const env = require("../config/env");
const LandRecord = require("../models/LandRecord");
const { FIELD_LABELS } = require("../models/LandRecord");

const REQUIRED_FIELDS = ["ownerName", "khasra", "village", "district", "year"];
const CURRENT_YEAR = new Date().getFullYear();

const AREA_PATTERN = /^\d+(\.\d+)?\s*(hectare|hectares|acre|acres|guntha|gunthas|sq\.?\s*m(?:etre|eter)?s?)$/i;
const KHASRA_PATTERN = /^\d+(\/\d+)?[a-z]?$/i;

function checkInvalidValues(values) {
  const issues = [];
  const suggestions = [];

  if (values.year) {
    const year = Number.parseInt(values.year, 10);
    if (!Number.isFinite(year) || String(values.year).trim().length !== 4) {
      issues.push({ type: "error", field: "year", message: "Record Year is not a valid 4-digit year." });
    } else if (year < 1900 || year > CURRENT_YEAR) {
      issues.push({
        type: "error",
        field: "year",
        message: `Record Year ${year} is outside the accepted range 1900-${CURRENT_YEAR}.`,
      });
    }
  }

  if (values.area && !AREA_PATTERN.test(values.area.trim())) {
    issues.push({
      type: "warning",
      field: "area",
      message: "Land Area is missing a recognized unit (hectare, acre, guntha).",
    });
    const numeric = values.area.match(/\d+(\.\d+)?/);
    if (numeric) {
      suggestions.push({
        field: "area",
        current: values.area,
        suggested: `${numeric[0]} hectare`,
        reason: "Default unit for Maharashtra land registers is hectare.",
      });
    }
  }

  if (values.khasra && !KHASRA_PATTERN.test(values.khasra.trim())) {
    issues.push({
      type: "warning",
      field: "khasra",
      message: "Khasra Number format looks unusual — expected patterns like 118 or 118/3.",
    });
  }

  if (values.survey && !/\d/.test(values.survey)) {
    issues.push({
      type: "warning",
      field: "survey",
      message: "Survey Number contains no digits — likely an OCR misread.",
    });
  }

  return { issues, suggestions };
}

async function findDuplicate(values, excludeId) {
  if (!values.khasra || !values.village) return null;
  const query = {
    khasra: values.khasra,
    village: new RegExp(`^${values.village.trim()}$`, "i"),
    status: { $in: ["pending", "approved"] },
  };
  if (values.year) query.year = values.year;
  if (excludeId) query._id = { $ne: excludeId };
  return LandRecord.findOne(query).select("recordId khasra village year").lean();
}

/**
 * Produces the validation payload rendered by ValidationPanel plus the derived
 * confidence score and priority used by the verification queue.
 */
async function validateRecord({ fields, ocrConfidence = 0, excludeId }) {
  const values = Object.fromEntries(fields.map((field) => [field.key, field.value]));
  const issues = [];
  const missingFields = [];

  REQUIRED_FIELDS.forEach((key) => {
    if (!values[key] || !String(values[key]).trim()) {
      missingFields.push(FIELD_LABELS[key]);
      issues.push({ type: "error", field: key, message: `Missing field: ${FIELD_LABELS[key]}.` });
    }
  });

  const { issues: invalidIssues, suggestions } = checkInvalidValues(values);
  issues.push(...invalidIssues);

  fields
    .filter((field) => field.value && field.confidence < env.thresholds.lowConfidenceField)
    .forEach((field) => {
      issues.push({
        type: "warning",
        field: field.key,
        message: `${field.label} confidence below ${env.thresholds.lowConfidenceField}% — manual confirmation advised.`,
      });
    });

  const duplicate = await findDuplicate(values, excludeId);
  const duplicateMessage = duplicate
    ? `Duplicate of ${duplicate.recordId} (Khasra ${duplicate.khasra}, ${duplicate.village})`
    : `No duplicate Khasra entry found${values.village ? ` for ${values.village}` : ""}`;
  issues.push(
    duplicate
      ? { type: "error", field: "khasra", message: duplicateMessage }
      : { type: "info", message: duplicateMessage },
  );

  const scored = fields.filter((field) => field.value);
  const fieldConfidence = scored.length
    ? scored.reduce((sum, field) => sum + field.confidence, 0) / scored.length
    : 0;
  const completeness = ((fields.length - missingFields.length) / fields.length) * 100;
  const confidence = Math.round(fieldConfidence * 0.6 + ocrConfidence * 0.2 + completeness * 0.2);

  const hasErrors = issues.some((issue) => issue.type === "error");
  let priority = "low";
  if (hasErrors || confidence < env.thresholds.lowConfidenceRecord) priority = "high";
  else if (confidence < 90) priority = "medium";

  return {
    confidence: Math.max(0, Math.min(100, confidence)),
    priority,
    isLowConfidence: confidence < env.thresholds.lowConfidenceRecord,
    validation: {
      issues,
      missingFields,
      duplicateOf: duplicate ? duplicate._id : undefined,
      duplicateMessage,
      suggestedCorrections: suggestions,
      validatedAt: new Date(),
    },
  };
}

module.exports = { validateRecord, REQUIRED_FIELDS };
