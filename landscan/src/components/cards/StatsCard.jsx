function StatsCard({ label, value, icon: Icon, delta, tone = "primary", hint }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/18 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/12 text-info",
  };
  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {Icon ? (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {delta || hint ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {delta ? <span className="font-semibold text-success">{delta}</span> : null}
          {delta && hint ? " · " : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default StatsCard;
