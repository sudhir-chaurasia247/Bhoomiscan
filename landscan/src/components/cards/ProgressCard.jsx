function ProgressCard({ title, subtitle, percent, footer, tone = "primary" }) {
  const bar = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
  }[tone];

  return (
    <div className="surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <span className="text-xl font-bold">{percent}%</span>
      </div>
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {footer ? <p className="mt-3 text-xs text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

export default ProgressCard;
