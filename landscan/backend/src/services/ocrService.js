const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const env = require("../config/env");
const logger = require("../utils/logger");

const execFileAsync = promisify(execFile);

const LOW_TOKEN_CONFIDENCE = 70;
const MIN_TEXT_LAYER_CHARS = 40;

/**
 * Renders a PDF to page PNGs using poppler's `pdftoppm`, which is required only for
 * scanned (image-only) PDFs. Returns an empty list when poppler is unavailable.
 */
async function renderPdfPages(filePath) {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "bhoomiscan-pdf-"));
  const prefix = path.join(outDir, "page");
  try {
    await execFileAsync("pdftoppm", ["-r", "200", "-png", filePath, prefix]);
  } catch (error) {
    logger.warn("pdftoppm unavailable — image-only PDF pages cannot be rasterized", error.message);
    await fs.rm(outDir, { recursive: true, force: true });
    return { dir: null, pages: [] };
  }
  const files = (await fs.readdir(outDir)).filter((name) => name.endsWith(".png")).sort();
  return { dir: outDir, pages: files.map((name) => path.join(outDir, name)) };
}

async function recognizeImage(imagePath, onProgress) {
  const { data } = await Tesseract.recognize(imagePath, env.ocr.langs, {
    cachePath: env.ocr.cacheDir,
    logger: (message) => {
      if (message.status === "recognizing text" && typeof onProgress === "function") {
        onProgress(Math.round(message.progress * 100));
      }
    },
  });

  return {
    text: data.text || "",
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    words: (data.words || []).map((word) => ({
      text: word.text,
      confidence: Math.round(word.confidence || 0),
    })),
  };
}

function collectLowConfidenceTokens(words) {
  const seen = new Set();
  const tokens = [];
  words
    .filter((word) => word.confidence < LOW_TOKEN_CONFIDENCE)
    .forEach((word) => {
      const clean = (word.text || "").trim();
      if (clean.length < 3 || seen.has(clean)) return;
      seen.add(clean);
      tokens.push(clean);
    });
  return tokens.slice(0, 12);
}

/**
 * Runs OCR over a stored document.
 *
 * @param {object} document Mongoose Document instance.
 * @param {(percent: number, partialText: string) => Promise<void>} onProgress
 *        Called as pages complete so the processing page can stream progress and text.
 */
async function runOcr(document, onProgress = async () => {}) {
  const startedAt = Date.now();
  const logs = [];
  const pageTexts = [];
  const words = [];

  const pushLog = (stage, message, level = "info") =>
    logs.push({ stage, message, level, at: new Date() });

  pushLog("ocr", `Starting OCR (${env.ocr.langs}) for ${document.originalName}`);

  let imagePaths = [document.filePath];
  let tempDir = null;

  if (document.fileType === "pdf") {
    const buffer = await fs.readFile(document.filePath);
    const parsed = await pdfParse(buffer).catch((error) => {
      pushLog("ocr", `PDF text layer unreadable: ${error.message}`, "warn");
      return null;
    });

    if (parsed && parsed.text && parsed.text.trim().length >= MIN_TEXT_LAYER_CHARS) {
      // Digital PDF: the embedded text layer is more accurate than rasterized OCR.
      pushLog("ocr", `Extracted embedded PDF text layer (${parsed.numpages} pages)`);
      await onProgress(100, parsed.text);
      return {
        engine: "pdf-text-layer",
        languages: env.ocr.langs,
        rawText: parsed.text.trim(),
        pageTexts: [parsed.text.trim()],
        confidence: 98,
        lowConfidenceTokens: [],
        words: [],
        processingMs: Date.now() - startedAt,
        pages: parsed.numpages || 1,
        logs,
      };
    }

    const rendered = await renderPdfPages(document.filePath);
    tempDir = rendered.dir;
    if (!rendered.pages.length) {
      pushLog("ocr", "No renderable pages found in PDF", "error");
      throw new Error(
        "Scanned PDF could not be rasterized. Install poppler-utils (pdftoppm) to OCR image-only PDFs.",
      );
    }
    imagePaths = rendered.pages;
    pushLog("ocr", `Rasterized ${imagePaths.length} PDF page(s) at 200 DPI`);
  }

  try {
    for (let index = 0; index < imagePaths.length; index += 1) {
      const pageStart = Date.now();
      // Pages are OCR'd sequentially so progress reflects real completion order.
      // eslint-disable-next-line no-await-in-loop
      const page = await recognizeImage(imagePaths[index], async (percent) => {
        const overall = Math.round(((index + percent / 100) / imagePaths.length) * 100);
        await onProgress(overall, pageTexts.join("\n\n"));
      });

      pageTexts.push(page.text.trim());
      page.words.forEach((word) => words.push({ ...word, page: index + 1 }));
      logs.push({
        stage: "ocr",
        message: `Page ${index + 1}/${imagePaths.length} recognized at ${Math.round(page.confidence)}% confidence`,
        level: page.confidence < 70 ? "warn" : "info",
        at: new Date(),
        durationMs: Date.now() - pageStart,
      });

      // eslint-disable-next-line no-await-in-loop
      await onProgress(Math.round(((index + 1) / imagePaths.length) * 100), pageTexts.join("\n\n"));
    }
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  const confidence = words.length
    ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
    : 0;

  return {
    engine: "tesseract.js",
    languages: env.ocr.langs,
    rawText: pageTexts.join("\n\n").trim(),
    pageTexts,
    confidence: Math.round(confidence),
    lowConfidenceTokens: collectLowConfidenceTokens(words),
    words,
    processingMs: Date.now() - startedAt,
    pages: imagePaths.length,
    logs,
  };
}

module.exports = { runOcr, collectLowConfidenceTokens };
