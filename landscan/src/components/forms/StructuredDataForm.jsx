function confidenceTone(c) {
  if (c >= 90) return "text-success";
  if (c >= 78) return "text-warning-foreground";
  return "text-destructive";
}

function StructuredDataForm({ fields, editable, onChange }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key} className="rounded-xl border border-border p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {f.label}
            </span>
            <span className={`text-xs font-bold ${confidenceTone(f.confidence)}`}>
              {f.confidence}%
            </span>
          </div>
          <input
            value={f.value}
            disabled={!editable}
            onChange={(e) => onChange(f.key, e.target.value)}
            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
              editable
                ? "border-input bg-card focus:border-primary focus:ring-4 focus:ring-primary/10"
                : "border-transparent bg-secondary/60 text-foreground"
            }`}
          />
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${
                f.confidence >= 90 ? "bg-success" : f.confidence >= 78 ? "bg-warning" : "bg-destructive"
              }`}
              style={{ width: `${f.confidence}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default StructuredDataForm;
