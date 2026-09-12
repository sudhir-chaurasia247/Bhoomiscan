import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { UploadCloud, FileText, Image as ImageIcon, Trash2, RotateCcw, CheckCircle2 } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import StatusBadge from "../../components/ui/StatusBadge";
import api from "../../services/api";

function UploadRecord() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [rawFiles, setRawFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [uploadedDocumentId, setUploadedDocumentId] = useState(null);
  const [meta, setMeta] = useState({ district: "Pune", taluka: "Haveli", village: "Wagholi", year: "1987" });

  const addFiles = (list) => {
    const incoming = Array.from(list);
    const next = incoming.map((f) => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      type: f.type.includes("pdf") ? "pdf" : "image",
      url: f.type.includes("image") ? URL.createObjectURL(f) : null,
    }));
    setFiles((prev) => [...prev, ...next]);
    setRawFiles((prev) => [...prev, ...incoming]);
    setStatus("ready");
  };

  const startUpload = async () => {
    if (!rawFiles.length) return;
    setStatus("uploading");
    setError("");
    setProgress(15);

    try {
      const formData = new FormData();
      rawFiles.forEach((f) => formData.append("files", f));
      formData.append("district", meta.district);
      formData.append("taluka", meta.taluka);
      formData.append("village", meta.village);
      formData.append("year", meta.year);

      const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const documents = res.data.data.documents;
      setUploadedDocumentId(documents[0]?.id || null);
      setProgress(100);
      setStatus("done");
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
      setStatus("ready");
    }
  };

  const reset = () => {
    setFiles([]);
    setRawFiles([]);
    setProgress(0);
    setStatus("idle");
    setUploadedDocumentId(null);
    setError("");
  };

  return (
    <AppLayout role="operator" title="Upload Record" subtitle="Submit scanned land records for OCR & AI extraction">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`surface flex flex-col items-center justify-center px-6 py-14 text-center transition ${
              dragging ? "border-primary bg-primary-soft" : ""
            }`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <UploadCloud className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">Drag &amp; drop land records here</h3>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
              Supported formats: PDF, JPG, PNG, TIFF · up to 25 MB per file. Multi-page village
              forms are accepted.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => inputRef.current?.click()} icon={UploadCloud}>
                Browse Files
              </Button>
              <Button variant="outline" onClick={reset} icon={RotateCcw}>
                Reset
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length ? (
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-semibold">File Preview ({files.length})</h3>
                <StatusBadge
                  status={status === "done" ? "approved" : status === "uploading" ? "processing" : "pending"}
                  label={status === "done" ? "Uploaded" : status === "uploading" ? "Uploading" : "Ready"}
                />
              </div>
              <ul>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
                    <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
                      {f.url ? (
                        <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                      ) : f.type === "pdf" ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <ImageIcon className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.size} · {f.type.toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {status !== "idle" && status !== "ready" ? (
            <div className="surface p-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Upload Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              {status === "done" ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Upload complete. Records queued for OCR extraction.
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({ to: `/operator/processing?documentId=${uploadedDocumentId}` })
                    }
                  >
                    Start OCR Processing
                  </Button>
                </div>
              ) : null}
              {error ? (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="surface space-y-4 p-5">
            <h3 className="text-sm font-semibold">Record Metadata</h3>
            <Select
              label="District"
              value={meta.district}
              onChange={(v) => setMeta({ ...meta, district: v })}
              options={["Pune", "Nashik", "Nagpur", "Solapur", "Kolhapur"].map((d) => ({ value: d, label: d }))}
            />
            <Select
              label="Taluka"
              value={meta.taluka}
              onChange={(v) => setMeta({ ...meta, taluka: v })}
              options={["Haveli", "Shirur", "Baramati", "Junnar"].map((d) => ({ value: d, label: d }))}
            />
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Village
              </span>
              <input
                value={meta.village}
                onChange={(e) => setMeta({ ...meta, village: e.target.value })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Record Year
              </span>
              <input
                value={meta.year}
                onChange={(e) => setMeta({ ...meta, year: e.target.value })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={startUpload} disabled={!files.length || status === "uploading"}>
                Upload
              </Button>
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
            </div>
          </div>

          <div className="surface p-5 text-sm text-muted-foreground">
            <h3 className="text-sm font-semibold text-foreground">Scanning Guidelines</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed">
              <li>· Scan at 300 DPI or higher for handwritten registers.</li>
              <li>· Keep the full page inside the frame, avoid shadows.</li>
              <li>· Prefer grayscale for faded ink; colour for stamps &amp; seals.</li>
              <li>· One record set per upload for accurate duplicate detection.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default UploadRecord;
