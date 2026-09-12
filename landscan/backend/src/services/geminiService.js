const { GoogleGenerativeAI } = require("@google/generative-ai");
const env = require("../config/env");
const logger = require("../utils/logger");
const { FIELD_KEYS, FIELD_LABELS } = require("../models/LandRecord");

const RESPONSE_SCHEMA_HINT = `{
  "ownerName": string,
  "fatherName": string,
  "khasra": string,
  "survey": string,
  "village": string,
  "taluka": string,
  "district": string,
  "state": string,
  "area": string,
  "year": string,
  "fieldConfidence": {
    "ownerName": number, "fatherName": number, "khasra": number, "survey": number,
    "village": number, "taluka": number, "district": number, "state": number,
    "area": number, "year": number
  }
}`;

const PROMPT = `You are an expert at reading Indian land records (Village Form VII / 7-12 extracts,
Khasra and mutation registers) that have been digitized with OCR. The OCR text may contain noise,
Devanagari transliteration artifacts and broken line breaks.

Extract the following fields and return ONLY minified JSON matching this shape:
${RESPONSE_SCHEMA_HINT}

Rules:
- Use "" for any field that is genuinely absent from the text. Never invent values.
- "area" must keep its unit (e.g. "1.25 hectare", "0.80 acre").
- "year" is a 4-digit record/mutation year.
- "khasra" keeps its sub-division form (e.g. "118/3"); "survey" keeps its prefix (e.g. "SUR-4218").
- fieldConfidence values are integers 0-100 describing how certain you are of each extracted value;
  use a low score when the source text was faded, ambiguous or reconstructed.`;

let client = null;
function getClient() {
  if (!env.gemini.apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(env.gemini.apiKey);
  return client;
}

function parseJsonResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini response contained no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const PATTERNS = {
  ownerName: [/owner\s*(?:name)?\s*[:\-]\s*(.+)/i, /(?:khatedar|holder)\s*[:\-]\s*(.+)/i],
  fatherName: [/father(?:'s)?\s*name\s*[:\-]\s*(.+)/i, /s\/o\s*[:\-]?\s*(.+)/i],
  khasra: [/khasra\s*(?:no\.?|number)?\s*[:\-]?\s*([\w/-]+)/i],
  survey: [/survey\s*(?:no\.?|number)?\s*[:\-]?\s*([\w/-]+)/i],
  village: [/village\s*[:\-]\s*([^\n\t]+?)(?:\s{2,}|\s*taluka|\s*$)/i],
  taluka: [/taluka\s*[:\-]\s*([^\n\t]+?)(?:\s{2,}|\s*district|\s*$)/i],
  district: [/district\s*[:\-]\s*([^\n\t]+?)(?:\s{2,}|\s*state|\s*$)/i],
  state: [/state\s*[:\-]\s*([^\n\t]+?)(?:\s{2,}|\s*$)/i],
  area: [/area\s*[:\-]\s*([\d.]+\s*(?:hectare|acre|guntha|sq\.?\s*m)[a-z]*)/i],
  year: [/(?:mutation\s*entry\s*year|record\s*year|year)\s*[:\-]?\s*((?:18|19|20)\d{2})/i],
};

/** Deterministic fallback so the pipeline still produces a record without a Gemini key. */
function ruleBasedExtract(ocrText) {
  const values = {};
  const confidence = {};

  FIELD_KEYS.forEach((key) => {
    const patterns = PATTERNS[key] || [];
    const match = patterns.map((pattern) => ocrText.match(pattern)).find(Boolean);
    const value = match ? match[1].trim().replace(/\s{2,}/g, " ") : "";
    values[key] = value;
    confidence[key] = value ? 72 : 0;
  });

  return { values, confidence, model: "rule-based-fallback" };
}

/**
 * Converts raw OCR text into the ten structured land-record fields.
 * Falls back to the rule-based extractor when Gemini is unavailable or errors.
 */
async function extractStructuredRecord(ocrText, context = {}) {
  const gemini = getClient();
  if (!ocrText || !ocrText.trim()) {
    return { values: Object.fromEntries(FIELD_KEYS.map((key) => [key, ""])), confidence: {}, model: "empty-ocr" };
  }
  if (!gemini) {
    logger.warn("GEMINI_API_KEY not configured — using rule-based extraction");
    return ruleBasedExtract(ocrText);
  }

  try {
    const model = gemini.getGenerativeModel({
      model: env.gemini.model,
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    });

    const contextLine = Object.entries(context)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    const result = await model.generateContent(
      `${PROMPT}\n\nOperator supplied metadata (use only to disambiguate): ${contextLine || "none"}\n\nOCR TEXT:\n"""\n${ocrText}\n"""`,
    );

    const parsed = parseJsonResponse(result.response.text());
    const values = {};
    const confidence = {};

    FIELD_KEYS.forEach((key) => {
      values[key] = typeof parsed[key] === "string" ? parsed[key].trim() : "";
      const score = Number(parsed.fieldConfidence?.[key]);
      confidence[key] = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : values[key] ? 80 : 0;
    });

    return { values, confidence, model: env.gemini.model };
  } catch (error) {
    logger.error("Gemini extraction failed — falling back to rule-based extractor", error);
    const fallback = ruleBasedExtract(ocrText);
    return { ...fallback, model: `${fallback.model} (gemini-error)`, error: error.message };
  }
}

/**
 * Blends Gemini's per-field certainty with the OCR word confidence of the tokens
 * that make up each value, producing the confidence the UI renders per field.
 */
function buildFields(values, aiConfidence, ocrWords = []) {
  const wordConfidence = new Map();
  ocrWords.forEach((word) => {
    const key = (word.text || "").toLowerCase().replace(/[^a-z0-9/-]/g, "");
    if (key) wordConfidence.set(key, word.confidence);
  });

  return FIELD_KEYS.map((key) => {
    const value = values[key] || "";
    const ai = aiConfidence[key] ?? (value ? 75 : 0);

    const tokens = value
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9/-]/g, ""))
      .filter(Boolean);
    const matched = tokens.map((token) => wordConfidence.get(token)).filter((score) => typeof score === "number");
    const ocrScore = matched.length ? matched.reduce((sum, score) => sum + score, 0) / matched.length : null;

    const blended = ocrScore === null ? ai : Math.round(ai * 0.6 + ocrScore * 0.4);

    return {
      key,
      label: FIELD_LABELS[key],
      value,
      confidence: value ? Math.max(1, Math.min(100, blended)) : 0,
    };
  });
}

module.exports = { extractStructuredRecord, buildFields, ruleBasedExtract };
