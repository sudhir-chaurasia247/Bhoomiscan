import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, RefreshCcw, Sparkles, Download, Send, Save } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import DocumentPreview from "../../components/dashboard/DocumentPreview";
import OcrTextPanel from "../../components/dashboard/OcrTextPanel";
import StructuredDataForm from "../../components/forms/StructuredDataForm";
import ValidationPanel from "../../components/dashboard/ValidationPanel";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import api from "../../services/api";

function OcrResult() {
  const navigate = useNavigate();
  const recordId = new URLSearchParams(window.location.search).get("recordId");

  const [record, setRecord] = useState(null);
  const [fields, setFields] = useState([]);
  const [editable, setEditable] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadRecord = async () => {
    if (!recordId) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/records/${recordId}`);
      const rec = res.data.data.record;
      setRecord(rec);
      setFields(rec.fields || []);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load record");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const overall = fields.length
    ? Math.round(fields.reduce((a, f) => a + (f.confidence || 0), 0) / fields.length)
    : 0;

  const update = (key, value) =>
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));

  if (loading) {
    return (
      <AppLayout role="operator" title="OCR Result" subtitle="Loading...">
        <div className="surface p-5">
          <p>Loading record...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role="operator"
      title="OCR Result"
      subtitle={`${record?.id || recordId || ""} · AI structured extraction`}
    >
      {toast ? (
        <div className="mb-4 rounded-lg bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
          {toast}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={record?.status || "processing"} />
          <span className="text-xs text-muted-foreground">
            {record?.ocr?.engine || "OCR engine"} · {record?.pages || 1} page(s)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCcw}
            onClick={async () => {
              try {
                await api.post(`/ocr/${record?.documentId}/rerun`);
                notify("OCR re-run queued for this document.");
              } catch (err) {
                notify(err.response?.data?.message || "Failed to queue OCR re-run");
              }
            }}
          >
            Re-run OCR
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={async () => {
              try {
                await api.post(`/records/${recordId}/extract`);
                notify("AI extraction re-run started.");
              } catch (err) {
                notify(err.response?.data?.message || "Failed to start AI extraction");
              }
            }}
          >
            Re-run AI Extraction
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => {
              window.open(`http://localhost:5000/api/records/${recordId}/report`, "_blank");
            }}
          >
            Download Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <DocumentPreview fileName={record?.document?.fileName} page={`Page 1 of ${record?.pages || 1}`} />
          <OcrTextPanel
            text={record?.ocr?.text || "No OCR text available"}
            lowConfidenceTokens={record?.ocr?.lowConfidenceTokens || []}
          />
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">AI Structured Data</h3>
              <Button
                variant={editable ? "success" : "soft"}
                size="sm"
                icon={editable ? Save : Pencil}
                onClick={async () => {
                  if (editable) {
                    try {
                      await api.patch(`/records/${recordId}`, { fields });
                      notify("Changes saved to draft record.");
                    } catch (err) {
                      notify(err.response?.data?.message || "Failed to save changes");
                    }
                  }
                  setEditable(!editable);
                }}
              >
                {editable ? "Save Data" : "Edit Data"}
              </Button>
            </div>
            <div className="mt-4">
              <StructuredDataForm fields={fields} editable={editable} onChange={update} />
            </div>
          </div>

          <ValidationPanel
            overall={overall}
            warnings={record?.validation?.warnings || []}
            missing={record?.validation?.missing || []}
          />

          <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-muted-foreground">
              Once submitted, this record moves to the verifier queue for approval.
            </p>
            <Button
              icon={Send}
              onClick={async () => {
                try {
                  await api.post(`/records/${recordId}/submit`);
                  navigate({ to: "/operator/uploads" });
                } catch (err) {
                  notify(err.response?.data?.message || "Failed to submit for verification");
                }
              }}
            >
              Send For Verification
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default OcrResult;
