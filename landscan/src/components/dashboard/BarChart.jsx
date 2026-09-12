function BarChart({ title, subtitle, data, series, legend = true }) {
  const max = Math.max(...data.flatMap((d) => series.map((s) => d[s.key]))) || 1;

  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {legend ? (
          <div className="flex flex-wrap gap-3">
            {series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
                {s.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex h-48 items-end gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end justify-center gap-1">
              {series.map((s) => (
                <div
                  key={s.key}
                  title={`${s.label}: ${d[s.key]}`}
                  className={`w-full max-w-4 rounded-t-md transition-all duration-700 ${s.color}`}
                  style={{ height: `${Math.max((d[s.key] / max) * 100, 4)}%` }}
                />
              ))}
            </div>
            <span className="truncate text-[11px] font-medium text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BarChart;
