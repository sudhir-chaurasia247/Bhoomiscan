import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, XCircle, RefreshCcw, Save } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import DocumentPreview from "../../components/dashboard/DocumentPreview";
import OcrTextPanel from "../../components/dashboard/OcrTextPanel";
import StructuredDataForm from "../../components/forms/StructuredDataForm";
import ValidationPanel from "../../components/dashboard/ValidationPanel";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import api from "../../services/api";

function ReviewRecord() {
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [fields, setFields] = useState([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    const loadRecord = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const recordId = params.get("recordId");

        if (!recordId) {
          notify("Record ID not found");
          setLoading(false);
          return;
        }

        const res = await api.get(`/verification/${recordId}`);

        const rec = res.data.data.record;

        setRecord(rec);
        setFields(rec.fields || []);
        setStatus(rec.status || "pending");
      } catch (err) {
        console.error("Failed to load record", err);
        notify("Failed to load record");
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, []);

  const overall =
    fields.length > 0
      ? Math.round(
        fields.reduce((sum, field) => sum + (field.confidence || 0), 0) /
        fields.length
      )
      : 0;

  if (loading) {
    return (
      <AppLayout role="verifier" title="Loading..." subtitle="">
        <div className="surface p-5">
          <p>Loading record...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role="verifier"
      title="Review Record"
      subtitle={`${record?.recordId || ""} · ${record?.village || ""}, ${record?.district || ""
        }`}
    >
      {toast ? (
        <div className="mb-4 rounded-lg bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
          {toast}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">
            Submitted by {record?.uploadedBy?.email || "Unknown"} · priority{" "}
            {record?.priority || "-"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/verifier/queue" })}
        >
          Back to queue
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <DocumentPreview
            fileName={record?.document?.originalName}
            page={`Page 1 of ${record?.document?.pages || 1}`}
          />

          <OcrTextPanel
            text={record?.ocr?.text || "No OCR text available"}
            lowConfidenceTokens={record?.ocr?.lowConfidenceTokens || []}
          />
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <h3 className="text-sm font-semibold">
              Editable Structured Data
            </h3>

            <div className="mt-4">
              <StructuredDataForm
                fields={fields}
                editable
                onChange={(key, value) =>
                  setFields((prev) =>
                    prev.map((field) =>
                      field.key === key
                        ? { ...field, value }
                        : field
                    )
                  )
                }
              />
            </div>
          </div>

          <ValidationPanel
            overall={overall}
            warnings={[]}
            missing={fields
              .filter((field) => !field.value)
              .map((field) => field.label)}
          />

          <div className="surface p-5">
            <h3 className="text-sm font-semibold">
              Verification Notes
            </h3>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Record your observations, corrections or reasons for rejection..."
              className="mt-3 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="success"
                icon={CheckCircle2}
                onClick={async () => {
                  try {
                    const params = new URLSearchParams(
                      window.location.search
                    );
                    const recordId = params.get("recordId");

                    const res = await api.post(
                      `/verification/${recordId}/approve`,
                      {
                        comments: notes,
                      }
                    );

                    setStatus("approved");
                    notify(res.data.data.message);
                  } catch (err) {
                    console.error(err);
                    notify("Approval failed");
                  }
                }}
              >
                Approve Record
              </Button>

              <Button
                variant="danger"
                icon={XCircle}
                onClick={async () => {
                  try {
                    const params = new URLSearchParams(
                      window.location.search
                    );
                    const recordId = params.get("recordId");

                    const res = await api.post(
                      `/verification/${recordId}/reject`,
                      {
                        comments: notes,
                      }
                    );

                    setStatus("rejected");
                    notify(res.data.data.message);
                  } catch (err) {
                    console.error(err);
                    notify("Rejection failed");
                  }
                }}
              >
                Reject Record
              </Button>

              <Button
                variant="outline"
                icon={RefreshCcw}
                onClick={async () => {
                  try {
                    const params = new URLSearchParams(
                      window.location.search
                    );
                    const recordId = params.get("recordId");

                    const res = await api.post(
                      `/verification/${recordId}/reprocess`,
                      {
                        comments: notes,
                      }
                    );

                    notify(res.data.data.message);
                  } catch (err) {
                    console.error(err);
                    notify("Reprocess failed");
                  }
                }}
              >
                Request Reprocessing
              </Button>

              <Button
                variant="soft"
                icon={Save}
                onClick={() => notify("Changes saved.")}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ReviewRecord;