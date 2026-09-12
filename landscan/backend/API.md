# BhoomiScan AI — Backend API Reference

Base URL: `http://localhost:5000/api` (configurable via `PORT` / `API_PREFIX`).

Every endpoint returns the same envelope:

```jsonc
// success
{ "success": true, "data": { /* payload */ }, "meta": { /* pagination, optional */ } }
// error
{ "success": false, "error": { "message": "…", "details": [ { "path": "email", "message": "…" } ] } }
```

Authenticated endpoints expect `Authorization: Bearer <accessToken>`. The refresh token is also
set as an httpOnly cookie, so `credentials: "include"` works for `/auth/refresh` and `/auth/logout`.

The payload field names below match `src/services/mockData.js` exactly, so pages can swap
mock imports for fetch calls without changing any JSX.

---

## Suggested frontend API client

Create `src/services/api.js` (new file only — no existing frontend file has to change shape):

```js
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

let accessToken = window.localStorage.getItem("bhoomiscan_token");

export function setToken(token) {
  accessToken = token;
  if (token) window.localStorage.setItem("bhoomiscan_token", token);
  else window.localStorage.removeItem("bhoomiscan_token");
}

export async function api(path, { method = "GET", body, isForm } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(isForm || !body ? {} : { "Content-Type": "application/json" }),
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || res.statusText);
  return json.data;
}
```

---

## 1. Authentication

### POST `/auth/login`
Used by `src/pages/auth/LoginPage.jsx`. `role` is optional; when sent it must match the account role,
which lets the existing role selector stay exactly as it is.

```js
const { user, accessToken } = await api("/auth/login", {
  method: "POST",
  body: { email, password, role },   // role: "operator" | "verifier" | "admin"
});
setToken(accessToken);
login(user);                          // AuthContext stores { name, email, role, office, district }
navigate({ to: `/${user.role}/dashboard` });
```

Response `data`: `{ user, accessToken, refreshToken }` where `user` is
`{ id: "U-1001", _id, name, email, role, district, office, status, lastActive }`.

### GET `/auth/me`
Re-hydrates `AuthContext` on boot (replaces reading `localStorage` blindly).

```js
const { user } = await api("/auth/me");
```

### POST `/auth/refresh`
Call when a request fails with 401. Sends the cookie automatically; body is optional.

```js
const { accessToken } = await api("/auth/refresh", { method: "POST", body: {} });
setToken(accessToken);
```

### POST `/auth/logout`
```js
await api("/auth/logout", { method: "POST", body: {} });
setToken(null);
```

### POST `/auth/register` (admin only)
Same payload as the Add User dialog plus a `password`. Admins normally use `POST /admin/users`,
which generates a temporary password instead.

---

## 2. Documents (operator upload flow)

### POST `/documents/upload` — `UploadRecord.jsx`
`multipart/form-data`, field name `files` (up to 10, PDF/JPG/PNG/TIFF/WebP, `MAX_FILE_SIZE_MB` each).

```js
const form = new FormData();
files.forEach((file) => form.append("files", file));
form.append("district", district);
form.append("taluka", taluka);
form.append("village", village);
form.append("year", year);

const { documents } = await api("/documents/upload", { method: "POST", body: form, isForm: true });
navigate({ to: "/operator/ocr-processing", search: { documentId: documents[0].id } });
```

### POST `/documents/:id/process` — starts OCR + Gemini (202 Accepted)
```js
await api(`/documents/${documentId}/process`, { method: "POST" });
```

### GET `/documents/:id/status` — polled by `OcrProcessing.jsx`
Drives the four stage cards and the streaming raw-text panel.

```js
const poll = setInterval(async () => {
  const s = await api(`/documents/${documentId}/status`);
  setStages({ upload: s.progress.upload, ocr: s.progress.ocr, ai: s.progress.ai, validation: s.progress.validation });
  setOcrText(s.ocrText);
  if (s.status === "processed") {
    clearInterval(poll);
    navigate({ to: "/operator/ocr-result", search: { recordId: s.recordId } });
  }
  if (s.status === "failed") { clearInterval(poll); toast.error(s.error); }
}, 2000);
```

`data`: `{ id, status, progress: { upload, ocr, ai, validation }, error, pages, ocrText,
ocrConfidence, lowConfidenceTokens, recordId, landRecordId, processingMs }`.
`status` is one of `uploaded | queued | processing | processed | failed`.

### GET `/documents` — `MyUploads.jsx`
Query: `q`, `status` (`all|processing|pending|approved|rejected`), `page`, `limit`.
Returns rows in the exact `mockData.records` shape, plus `meta: { page, limit, total, totalPages }`.

```js
const rows = await api(`/documents?q=${encodeURIComponent(query)}&status=${status}`);
```

### GET `/documents/:id/file` — inline preview for `DocumentPreview`
```jsx
<img src={`${BASE}/documents/${documentId}/file`} alt="scan" />
```
(Static files are also served from `/uploads/<storedName>`.)

### GET `/documents/:id` / DELETE `/documents/:id`
Metadata fetch and removal (removes the file, OCR result and land record).

---

## 3. OCR

### GET `/ocr/:documentId`
Raw text, per-page text, engine, low-confidence tokens and processing logs.

```js
const ocr = await api(`/ocr/${documentId}`);
// { text, pageTexts, confidence, lowConfidenceTokens, engine, languages, processingMs, logs }
```

### POST `/ocr/:documentId/rerun` — "Re-run OCR" on `OcrResult.jsx` (202)
```js
await api(`/ocr/${documentId}/rerun`, { method: "POST" });
// then resume polling /documents/:id/status
```

---

## 4. Land records

`:id` accepts either the Mongo id or the human `BSR-2026-1041` id shown in the UI.

### GET `/records/:id` — `OcrResult.jsx` and `ReviewRecord.jsx`
```js
const { record } = await api(`/records/${recordId}`);
```

`record` contains everything those two pages render:

```jsonc
{
  "id": "BSR-2026-1041", "_id": "…", "documentId": "…",
  "owner": "…", "khasra": "…", "village": "…", "district": "…",
  "status": "draft", "priority": "high", "confidence": 88,
  "uploadedBy": "op.ramesh", "uploadedOn": "2026-09-08", "pages": 1, "fileName": "scan.png",
  "fields": [ { "key": "ownerName", "label": "Owner Name", "value": "…", "confidence": 96 } ],
  "overall": 88,
  "ocr": { "text": "…", "confidence": 94, "lowConfidenceTokens": ["…"], "logs": ["…"] },
  "validation": {
    "overall": 88,
    "warnings": [ { "type": "error|warning|info|success", "message": "…", "field": "khasra" } ],
    "missing": ["Father Name"],
    "duplicate": "No duplicate found",
    "suggestedCorrections": [ { "field": "year", "current": "20l9", "suggested": "2019", "reason": "…" } ]
  },
  "document": { "id": "…", "fileName": "…", "pages": 1, "url": "/uploads/…", "progress": { … } }
}
```

`fields[]` maps 1:1 onto `StructuredDataForm`, `validation.warnings` onto `ValidationPanel`.

### PATCH `/records/:id` — "Save Data" / "Save Changes"
Send only the fields that changed; edited values are marked `editedByUser` and re-validated server-side.

```js
const { record } = await api(`/records/${recordId}`, {
  method: "PATCH",
  body: { fields: [{ key: "ownerName", value: "Ramesh Shivaji Kulkarni" }] },
});
```

### POST `/records/:id/submit` — "Send For Verification"
Moves the record to `pending` and into the verifier queue.

### POST `/records/:id/extract` — "Re-run AI Extraction" (202)
Re-runs Gemini over the stored OCR text, then re-validates.

### GET `/records/:id/report` — "Download Report"
Returns `text/plain` as an attachment.

```js
const res = await fetch(`${BASE}/records/${recordId}/report`, { headers: { Authorization: `Bearer ${token}` } });
const blob = await res.blob();
```

### GET `/records/search` — `SearchRecords.jsx`
Query: `owner`, `khasra`, `survey`, `village`, `district`, `status`, `page`, `limit`
(all optional; operators are scoped to their own uploads).

```js
const results = await api(`/records/search?${new URLSearchParams({ owner, khasra, survey, village, district, status })}`);
```

---

## 5. Verification (verifier / admin)

### GET `/verification/queue` — `VerificationQueue.jsx`
Query: `q`, `priority` (`all|high|medium|low`), `confidence` (`all|high|medium|low`), `district`, `page`, `limit`.
`confidence` buckets: high ≥ 90, medium 80–89, low < 80.

```js
const queue = await api(`/verification/queue?q=${query}&priority=${priority}&confidence=${confidence}`);
```

### POST `/verification/:recordId/approve` and `/reject`
`comments` is optional on approve and **required** on reject.

```js
await api(`/verification/${recordId}/approve`, { method: "POST", body: { comments: notes } });
await api(`/verification/${recordId}/reject`,  { method: "POST", body: { comments: notes } });
```

### POST `/verification/:recordId/reprocess` — "Request Reprocessing" (202)
Sends the document back through OCR + AI and records the request in the audit trail.

### GET `/verification/:recordId/history`
`[{ id, action, comments, verifier, at }]` — approvals, rejections and reprocess requests.

---

## 6. Dashboards

### GET `/dashboard/operator`
```jsonc
{
  "stats": { "totalUploads": 12, "pendingVerification": 3, "verified": 8, "rejected": 1, "uploadedThisMonth": 5 },
  "recentUploads": [ /* record rows */ ],
  "activity": [ { "type": "upload", "text": "…", "time": "4 min ago" } ]
}
```

### GET `/dashboard/verifier`
```jsonc
{
  "stats": { "pendingInQueue": 24, "highPriority": 6, "approvedByYou": 91, "rejectedByYou": 7,
             "rejectionRate": 7.1, "avgReviewTime": "3m 12s" },
  "queuePreview": [ /* record rows */ ],
  "activity": [ … ]
}
```

### GET `/dashboard/admin`
`{ stats, districts, monthlyUploads, activity }` — `districts` and `monthlyUploads` use the same
shapes as `mockData.districts` / `mockData.monthlyUploads`, `stats` the same keys as `mockData.adminStats`.

---

## 7. Admin

### GET `/admin/analytics` — `Analytics.jsx`
```jsonc
{
  "stats": { "totalRecords": 17060, "verified": 13420, "pending": 2760, "rejected": 880,
             "operators": 148, "verifiers": 42, "ocrAccuracy": 94.2, "aiAccuracy": 91.8,
             "digitizationProgress": 78, "avgProcessingTime": "12 sec", "processedToday": 340,
             "duplicateRate": 1.4, "verificationRate": 78.6 },
  "districts": [ { "name": "Pune", "records": 120, "verified": 90, "pending": 20, "rejected": 10, "accuracy": 93 } ],
  "monthlyUploads": [ { "month": "Feb", "uploads": 120, "verified": 90, "accuracy": 93 } ],
  "accuracyTrend": [ { "month": "Feb", "accuracy": 93 } ],
  "verificationTrend": [ { "month": "Feb", "uploads": 120, "verified": 90 } ]
}
```

### GET `/admin/users` — `UserManagement.jsx`
Query: `q`, `role` (`all|operator|verifier|admin`), `status`, `page`, `limit`.
Rows match `mockData.users`: `{ id: "U-1001", _id, name, email, role, district, status, lastActive: "2 min ago" }`.

### POST `/admin/users` — Add User dialog
The dialog has no password input, so the API generates one and returns it once.

```js
const { user, temporaryPassword } = await api("/admin/users", {
  method: "POST",
  body: { name, email, role, district },
});
```

### PATCH `/admin/users/:id` and PATCH `/admin/users/:id/status`
```js
await api(`/admin/users/${user._id}/status`, {
  method: "PATCH",
  body: { status: user.status === "active" ? "disabled" : "active" },
});
```

Disabling a user also revokes their refresh tokens. Admins cannot disable their own account.

---

## 8. Notifications

### GET `/notifications`
Role-aware list for the header bell, in `mockData.notifications` shape:
`[{ title, detail, time }]`.

---

## 9. Health

### GET `/health`
`{ status: "ok", uptime }` — unauthenticated, for probes.

---

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created (upload, user creation) |
| 202 | Accepted — background job started (process, rerun, re-extract, reprocess) |
| 400 | Validation error (`error.details` lists the offending fields) |
| 401 | Missing/expired access token — call `/auth/refresh` |
| 403 | Role not allowed, account disabled, or record locked |
| 404 | Resource not found |
| 409 | Duplicate email |
| 413 | File exceeds `MAX_FILE_SIZE_MB` |
| 429 | Auth rate limit (100 requests / 15 min) |
| 500 | Unexpected server error |

## Role matrix

| Endpoint group | operator | verifier | admin |
| --- | --- | --- | --- |
| `/documents` (own uploads only for operators) | ✔ | read | ✔ |
| `/ocr` | ✔ | ✔ | ✔ |
| `/records` (operators scoped to own records) | ✔ | ✔ | ✔ |
| `/verification` | ✖ | ✔ | ✔ |
| `/dashboard/operator` | ✔ | ✖ | ✔ |
| `/dashboard/verifier` | ✖ | ✔ | ✔ |
| `/dashboard/admin`, `/admin/*` | ✖ | ✖ | ✔ |
