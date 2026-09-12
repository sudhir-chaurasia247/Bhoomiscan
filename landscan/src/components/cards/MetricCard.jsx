function MetricCard({ label, value, unit, description, progress }) {
  return (
    <div className="surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">
        {value}
        {unit ? <span className="ml-1 text-base font-semibold text-muted-foreground">{unit}</span> : null}
      </p>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {description ? <p className="mt-3 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export default MetricCard;
