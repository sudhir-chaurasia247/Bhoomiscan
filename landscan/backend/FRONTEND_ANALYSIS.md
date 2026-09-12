# BhoomiScan AI — Frontend Analysis & Derived Backend Requirements

Analysis of the shipped React frontend (`landscan-ai-main`, TanStack Start + TanStack Router,
Tailwind v4, JSX pages) performed **before** any backend code was written. Nothing in the frontend
architecture is changed by the backend; every endpoint below exists because a concrete page,
component or form in the current UI needs it.

---

## 1. Frontend inventory

### 1.1 Routes (file-based, `src/routes/*`)

| Route | Page component | Role | Purpose |
|---|---|---|---|
| `/` | `pages/auth/LoginPage.jsx` | public | Email + password + role selector, redirects to `/{role}/dashboard` |
| `/operator/dashboard` | `pages/operator/OperatorDashboard.jsx` | operator | Stats cards, monthly bar chart, recent uploads table |
| `/operator/upload` | `pages/operator/UploadRecord.jsx` | operator | Drag & drop multi-file upload + metadata form + progress |
| `/operator/processing` | `pages/operator/OcrProcessing.jsx` | operator | 4-stage pipeline progress + live OCR text stream |
| `/operator/result` | `pages/operator/OcrResult.jsx` | operator | Document preview, raw OCR text, structured fields, validation, submit |
| `/operator/uploads` | `pages/operator/MyUploads.jsx` | operator | Searchable/filterable table of own uploads |
| `/verifier/dashboard` | `pages/verifier/VerifierDashboard.jsx` | verifier | Stats, verification trend, activity feed, top priority records |
| `/verifier/queue` | `pages/verifier/VerificationQueue.jsx` | verifier | Pending queue with query/priority/confidence filters |
| `/verifier/review` | `pages/verifier/ReviewRecord.jsx` | verifier | Editable fields, validation, notes, approve/reject/reprocess/save |
| `/admin/dashboard` | `pages/admin/AdminDashboard.jsx` | admin | System-wide stats, district chart + table, activity feed |
| `/admin/analytics` | `pages/admin/Analytics.jsx` | admin | Accuracy metrics, monthly trends, district performance |
| `/admin/users` | `pages/admin/UserManagement.jsx` | admin | User table, role filter, create user, enable/disable |
| `/admin/queue` | `pages/verifier/VerificationQueue.jsx` (`role="admin"`) | admin | Same queue component, admin oversight |
| `/search` | `pages/common/SearchRecords.jsx` | any | Multi-field land-record search |

### 1.2 Shared components that define the data shapes

| Component | Contract it imposes |
|---|---|
| `components/forms/StructuredDataForm.jsx` | `fields: [{ key, label, value, confidence }]` — per-field confidence 0-100 |
| `components/dashboard/ValidationPanel.jsx` | `overall: number`, `warnings: [{ type: "error"\|"warning"\|"info"\|"success", message }]`, `duplicate: string`, `missing: string[]` |
| `components/dashboard/OcrTextPanel.jsx` | `text: string` plus `lowConfidenceTokens: string[]` used to highlight substrings |
| `components/dashboard/DocumentPreview.jsx` | needs a previewable file URL + page count |
| `components/dashboard/BarChart.jsx` | `data: [{ label, <seriesKey>: number }]` |
| `components/dashboard/LineChart.jsx` | `data: [{ month, accuracy }]` (`valueKey`) |
| `components/tables/DataTable.jsx` | plain array of row objects |
| `components/ui/StatusBadge.jsx` | statuses: `pending`, `processing`, `approved`, `rejected`, priorities `high`/`medium`/`low`, roles `operator`/`verifier`/`admin`, `active`/`disabled` |
| `components/layout/Navbar.jsx` | `user: { name, email, role }`, notifications `[{ title, detail, time }]` |
| `context/AuthContext.jsx` | persists the user in `localStorage["bhoomiscan_user"]`; exposes `login(email, role)`, `logout()`, `user`, `ready` |

### 1.3 Mock data that the API must replace (`src/services/mockData.js`)

- `records[]` → land record row shape:
  `{ id, owner, fatherName, khasra, survey, village, taluka, district, state, area, year, status, priority, confidence, uploadedBy, uploadedOn, pages, fileName }`
- `districts[]` → `{ name, records, verified, pending, rejected, accuracy }`
- `monthlyUploads[]` → `{ month, uploads, verified, accuracy }`
- `users[]` → `{ id, name, email, role, district, status, lastActive }`
- `activityFeed[]` → `{ type: "upload"\|"ocr"\|"verify", text, time }`
- `notifications[]` → `{ title, detail, time }`
- `adminStats` → `{ totalRecords, verified, pending, rejected, operators, verifiers, ocrAccuracy, aiAccuracy, digitizationProgress, avgProcessingTime, processedToday }`
- `sampleOcrText`, `lowConfidenceTokens`, `structuredFields[]`, `validationWarnings[]`

**Every response below is shaped to be a drop-in replacement for these exports**, so wiring the UI
means swapping a `mockData` import for a `fetch`, with no component prop changes.

### 1.4 User flows observed in the code

1. **Login** — role is chosen in the UI and stored client-side; the backend must return the real role
   and reject a mismatch, while keeping the same `{ user }` shape the `AuthContext` persists.
2. **Upload** — multiple files (`.pdf,image/*`, up to 25 MB) + metadata `{ district, taluka, village, year }`,
   upload progress bar, then "Start OCR Processing" navigates to `/operator/processing`.
3. **Processing** — four sequential stages the UI animates: `upload → ocr → ai → validation`, each with a
   percentage, plus a live OCR text stream. Requires a pollable job-status endpoint.
4. **Result** — raw OCR text + AI structured fields with per-field confidence, editable/saveable,
   re-run OCR, re-run AI extraction, download report, and "Send For Verification".
5. **Verification** — queue filtered by query/priority/confidence → review page with editable fields,
   notes, approve / reject / request reprocessing / save.
6. **Search** — owner, khasra, survey, village, district, status.
7. **Admin** — dashboard stats, district statistics, analytics trends, user CRUD + enable/disable.

---

## 2. Derived requirements

### 2.1 API requirements (grouped by the page that needs them)

| Page / action | Endpoint |
|---|---|
| Login form submit | `POST /api/auth/login` |
| Admin "Add User" | `POST /api/auth/register` (admin) |
| Navbar logout | `POST /api/auth/logout` |
| App bootstrap / refresh profile | `GET /api/auth/me`, `POST /api/auth/refresh` |
| Upload page | `POST /api/documents/upload` (multipart, multi-file) |
| Upload page → Start OCR | `POST /api/documents/:id/process` |
| Processing page polling | `GET /api/documents/:id/status` |
| Processing page live OCR text | included in the status payload (`ocrText`) |
| My Uploads table | `GET /api/documents?status=&q=&page=&limit=` |
| OCR Result page | `GET /api/records/:id` |
| Re-run OCR | `POST /api/ocr/:documentId/rerun` |
| Re-run AI extraction | `POST /api/records/:id/extract` |
| Save edited fields | `PATCH /api/records/:id` |
| Download validation report | `GET /api/records/:id/report` |
| Send for verification | `POST /api/records/:id/submit` |
| Verification queue | `GET /api/verification/queue?q=&priority=&confidence=` |
| Review record | `GET /api/records/:id` |
| Approve / Reject | `POST /api/verification/:recordId/approve` / `/reject` |
| Request reprocessing | `POST /api/verification/:recordId/reprocess` |
| Search page | `GET /api/records/search?owner=&khasra=&survey=&village=&district=&status=` |
| Operator dashboard | `GET /api/dashboard/operator` |
| Verifier dashboard | `GET /api/dashboard/verifier` |
| Admin dashboard | `GET /api/admin/dashboard` |
| Analytics | `GET /api/admin/analytics` |
| User management | `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `PATCH /api/admin/users/:id/status` |
| Navbar bell | `GET /api/notifications` |
| Document preview image/pdf | `GET /api/documents/:id/file` (also served statically from `/uploads`) |

No other endpoints are implemented — the surface is exactly what the current UI consumes.

### 2.2 Database models

| Model | Why the frontend needs it |
|---|---|
| `User` | login, role-based menus, `uploadedBy` column, admin user table (`district`, `status`, `lastActive`) |
| `Document` | uploaded file metadata, `fileName`, `pages`, upload metadata form, per-document status |
| `OCRResult` | raw text panel, OCR confidence, low-confidence tokens, processing logs, engine timings |
| `LandRecord` | every column of `records[]` + structured fields with per-field confidence + validation issues |
| `Verification` | approve/reject decisions, verifier notes/comments, review durations for "Avg Review Time" |
| `AuditLog` | activity feed on verifier/admin dashboards and notifications |

### 2.3 Authentication flows

- Email + password login returning a short-lived **access JWT** and a longer-lived **refresh JWT**
  (refresh delivered as an httpOnly cookie *and* in the body so the existing localStorage-based
  `AuthContext` keeps working unchanged).
- `GET /api/auth/me` to re-hydrate the profile the Navbar renders.
- Role-based access: `operator` (upload/OCR/own records), `verifier` (queue/approve/reject),
  `admin` (everything + user management). Disabled users are rejected at login and on every request.
- Registration is admin-only, matching the UI (there is no public sign-up screen).

### 2.4 OCR workflow

`upload → queued → tesseract.recognize (per page/file) → raw text + word-level confidence →
low-confidence token extraction → OCRResult persisted → stage progress updated`.
Stage progress (`upload`, `ocr`, `ai`, `validation`) is persisted on the `Document` so the
processing page can poll it, and the partially-recognized text is streamed back for the live panel.

### 2.5 Gemini extraction workflow

Raw OCR text → Gemini (`GEMINI_MODEL`, JSON response schema) → the exact ten fields the
`StructuredDataForm` renders (owner, father, khasra, survey, village, taluka, district, state, area,
year), each with a per-field confidence blended with the OCR word confidence for that field's tokens.
A deterministic regex-based extractor is used as a fallback when no API key is configured or Gemini
fails, so the pipeline never dead-ends.

### 2.6 Validation workflow

Missing required fields, duplicate detection (`khasra + village + taluka + year` unique-ish key),
invalid values (year range, area format, khasra/survey patterns), and low-confidence flags
(<78% field, <80% record). Produces `warnings[]` in exactly the `ValidationPanel` shape, a
`missing[]` list, a `duplicate` message and an `overall` confidence score, plus suggested corrections.

### 2.7 Verification workflow

Records with `status=pending` land in the queue with a derived `priority` (`high` if confidence < 80
or errors present, `medium` < 90, else `low`). Verifier approves/rejects with comments, may edit
fields first, or request reprocessing (which resets the document to the OCR stage). Every transition
writes a `Verification` document and an `AuditLog` entry.

### 2.8 Analytics workflow

Aggregation pipelines over `LandRecord` / `Document` / `User` produce the district table, monthly
upload & verification trend (last 8 months, `{ month, uploads, verified, accuracy }`), OCR/AI accuracy
averages, verification rate, duplicate detection rate, average processing time and processed-today
counters — i.e. `adminStats`, `districts` and `monthlyUploads` computed for real.
