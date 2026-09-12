import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ScanLine, Sparkles, ShieldCheck, FileText, Loader2 } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import Button from "../../components/ui/Button";
import api from "../../services/api";

const STAGES = [
  { key: "ocr", label: "OCR Text Extraction", icon: ScanLine, detail: "Tesseract + handwriting model" },
  { key: "ai", label: "AI Structuring (Gemini)", icon: Sparkles, detail: "Mapping text to land fields" },
  { key: "validation", label: "Validation & Duplicate Check", icon: ShieldCheck, detail: "Rules + database match" },
];

function OcrProcessing() {
  const navigate = useNavigate();
  const documentId = new URLSearchParams(window.location.search).get("documentId");

  const [progress, setProgress] = useState({ upload: 0, ocr: 0, ai: 0, validation: 0 });
  const [ocrText, setOcrText] = useState("");
  const [recordId, setRecordId] = useState(null);
  const [status, setStatus] = useState("queued");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!documentId) {
      setError("No document selected. Upload a record first.");
      return;
    }

    let cancelled = false;
    let pollTimer;

    const poll = async () => {
      try {
        const res = await api.get(`/documents/${documentId}/status`);
        const data = res.data.data;
        if (cancelled) return;

        setProgress(data.progress || { upload: 100, ocr: 0, ai: 0, validation: 0 });
        setOcrText(data.ocrText || "");
        setStatus(data.status);
        if (data.recordId) setRecordId(data.recordId);

        if (data.status === "failed") {
          setError(data.error || "Processing failed");
          return;
        }
        if (data.status !== "completed") {
          pollTimer = setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load processing status");
      }
    };

    const start = async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        await api.post(`/documents/${documentId}/process`);
      } catch (err) {
        // Already processing or already done — fall through to polling regardless.
      }
      poll();
    };

    start();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [documentId]);

  const done = status === "completed";
  const overall = Math.round(((progress.ocr || 0) + (progress.ai || 0) + (progress.validation || 0)) / 3);

  return (
    <AppLayout role="operator" title="OCR Processing" subtitle={documentId ? `Document ${documentId}` : ""}>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="surface p-7">
            <div className="flex items-center gap-4">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                {done ? <ShieldCheck className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
              </span>
              <div>
                <h2 className="text-lg font-semibold">
                  {done ? "Processing complete" : "Processing your document"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {error
                    ? error
                    : done
                      ? "Structured data is ready for review."
                      : "Processing in progress · do not close this window"}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Overall Progress</span>
                <span>{overall}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${overall}%` }}
                />
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {STAGES.map((s) => (
                <div key={s.key} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        progress[s.key] >= 100
                          ? "bg-success/12 text-success"
                          : progress[s.key] > 0
                            ? "bg-primary-soft text-primary"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{s.label}</p>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {progress[s.key]}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress[s.key] >= 100 ? "bg-success" : "bg-primary"
                      }`}
                      style={{ width: `${progress[s.key]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <Button
                disabled={!done}
                onClick={() =>
                  navigate({ to: `/operator/result?recordId=${recordId || documentId}` })
                }
              >
                View OCR Result
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/operator/uploads" })}>
                Process in background
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="surface overflow-hidden">
            <p className="border-b border-border px-5 py-3.5 text-sm font-semibold">
              Document Preview
            </p>
            <div className="p-5">
              <div className="flex aspect-[3/4] flex-col justify-between rounded-lg border border-dashed border-border bg-secondary/60 p-5">
                <div className="space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted-foreground/25" />
                  <div className="h-2 w-full rounded bg-muted-foreground/15" />
                  <div className="h-2 w-5/6 rounded bg-muted-foreground/15" />
                  <div className="h-2 w-4/6 rounded bg-muted-foreground/15" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Village Form VII · Page 1 of 2
                </div>
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <p className="text-sm font-semibold">Live OCR Stream</p>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/70 p-4 text-[11px] leading-relaxed text-muted-foreground">
              {ocrText || "Waiting for OCR output..."}
              {!done && ocrText ? "▌" : ""}
            </pre>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default OcrProcessing;
