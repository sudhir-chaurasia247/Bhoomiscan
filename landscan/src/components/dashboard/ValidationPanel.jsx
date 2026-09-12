import { AlertTriangle, Info, XOctagon, CheckCircle2 } from "lucide-react";

const MAP = {
  warning: { icon: AlertTriangle, cls: "bg-warning/12 text-warning-foreground" },
  error: { icon: XOctagon, cls: "bg-destructive/10 text-destructive" },
  info: { icon: Info, cls: "bg-info/10 text-info" },
  success: { icon: CheckCircle2, cls: "bg-success/10 text-success" },
};

function ValidationPanel({ overall, warnings, duplicate = "No duplicate found", missing = [] }) {
  return (
    <div className="surface p-5">
      <h3 className="text-sm font-semibold">Validation &amp; Confidence</h3>

      <div className="mt-4 flex items-center gap-4 rounded-xl bg-secondary/60 p-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 97.4} 97.4`}
            />
          </svg>
          <span className="absolute text-sm font-bold">{overall}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Overall Confidence Score</p>
          <p className="text-xs text-muted-foreground">
            {overall >= 90
              ? "High confidence — ready for verification."
              : "Medium confidence — review flagged fields."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Duplicate Detection
          </p>
          <p className="mt-1 text-sm font-medium text-success">{duplicate}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Missing Fields
          </p>
          <p className="mt-1 text-sm font-medium">
            {missing.length ? (
              <span className="text-destructive">{missing.join(", ")}</span>
            ) : (
              <span className="text-success">None</span>
            )}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {warnings.map((w) => {
          const cfg = MAP[w.type] || MAP.info;
          return (
            <li key={w.message} className={`flex items-start gap-2.5 rounded-lg p-3 text-sm ${cfg.cls}`}>
              <cfg.icon className="mt-0.5 h-4 w-4 flex-none" />
              {w.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ValidationPanel;
