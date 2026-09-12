# BhoomiScan AI — Backend

Express + MongoDB backend built specifically for the existing BhoomiScan AI React frontend.
No frontend file, route or component contract was changed: every response mirrors the shapes
already used in `src/services/mockData.js`.

- [`API.md`](./API.md) — endpoint reference with the exact fetch call each page should make.
- [`FRONTEND_ANALYSIS.md`](./FRONTEND_ANALYSIS.md) — page-by-page analysis the API was derived from.

## Stack

Node.js · Express 4 · MongoDB + Mongoose · JWT (access + refresh) · Multer · Tesseract.js ·
Google Gemini · Zod · Helmet / CORS / rate limiting.

## Quick start

```bash
cd backend
cp .env.example .env          # then set MONGODB_URI, JWT secrets and GEMINI_API_KEY
npm install
npm run seed                  # creates the demo accounts used by the login screen
npm run dev                   # http://localhost:5000/api
```

Point the frontend at it with `VITE_API_URL=http://localhost:5000/api` and add the frontend origin
to `CORS_ORIGINS`.

Seeded accounts (password = `SEED_ADMIN_PASSWORD`): `op.ramesh@gov.in`, `op.sneha@gov.in`,
`vf.vaishali@gov.in`, `vf.prakash@gov.in`, `admin.meera@gov.in`.

### System dependency

Image-only (scanned) PDFs are rasterized with `pdftoppm` before OCR:

```bash
sudo apt-get install -y poppler-utils
```

Digital PDFs with a text layer and plain images work without it; if a scanned PDF is uploaded while
`pdftoppm` is missing, the document fails with an explicit message instead of silently producing
empty text.

## Folder structure

```
backend/
├── src/
│   ├── config/        env loading, MongoDB connection
│   ├── controllers/   auth, documents, ocr, records, verification, dashboard, admin, notifications
│   ├── middleware/    auth (JWT + RBAC), validate (zod), upload (multer), errorHandler
│   ├── models/        User, Document, OCRResult, LandRecord, Verification, AuditLog
│   ├── routes/        one router per module, mounted in routes/index.js
│   ├── services/      ocr, gemini, validation, pipeline, analytics, token, audit
│   ├── utils/         ApiError, asyncHandler, response, serializers, logger, seed
│   ├── app.js         express app factory
│   └── server.js      bootstrap (db connect + listen + graceful shutdown)
├── uploads/           multer storage (git-ignored)
└── scripts/           dev helpers
```

## Processing pipeline

`pipelineService.processDocument()` runs the four stages the OCR Processing page renders, persisting
progress after each one so the UI can poll `GET /documents/:id/status`:

1. **Upload** — file stored by Multer, metadata saved on `Document`.
2. **OCR** — `pdf-parse` text layer for digital PDFs, otherwise Tesseract.js
   (`pdftoppm` rasterization for scanned PDFs). Word-level confidence and low-confidence tokens
   are stored on `OCRResult`.
3. **AI extraction** — Gemini turns the raw text into the ten structured fields. Without
   `GEMINI_API_KEY`, or if the call fails, a deterministic regex extractor takes over so the
   pipeline still completes. Per-field confidence blends the model score with OCR word confidence.
4. **Validation** — missing fields, format checks (year, area units, Khasra/survey), low-confidence
   fields and duplicate detection produce `validation.issues`, the overall confidence and the
   priority used by the verification queue.

Records below `LOW_CONFIDENCE_RECORD_THRESHOLD`, or with validation errors, are flagged `high`
priority; the operator submits them and the verifier approves, rejects or requests reprocessing.
Every stage and decision is written to `AuditLog`, which feeds the dashboard activity feeds.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | nodemon dev server |
| `npm start` | production server |
| `npm run seed` | create demo users |
| `npm run lint` | eslint |
