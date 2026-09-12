const STYLES = {
  approved: "bg-success/12 text-success border-success/25",
  verified: "bg-success/12 text-success border-success/25",
  active: "bg-success/12 text-success border-success/25",
  pending: "bg-warning/15 text-warning-foreground border-warning/35",
  processing: "bg-info/12 text-info border-info/25",
  rejected: "bg-destructive/10 text-destructive border-destructive/25",
  disabled: "bg-muted text-muted-foreground border-border",
  high: "bg-destructive/10 text-destructive border-destructive/25",
  medium: "bg-warning/15 text-warning-foreground border-warning/35",
  low: "bg-primary-soft text-primary border-primary/20",
  operator: "bg-primary-soft text-primary border-primary/20",
  verifier: "bg-info/12 text-info border-info/25",
  admin: "bg-accent text-accent-foreground border-primary/20",
};

function StatusBadge({ status, label }) {
  const key = String(status || "").toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
        STYLES[key] || STYLES.disabled
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label || status}
    </span>
  );
}

export default StatusBadge;
