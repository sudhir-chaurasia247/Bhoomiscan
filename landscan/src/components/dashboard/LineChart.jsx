function LineChart({ title, subtitle, data, valueKey, suffix = "" }) {
  const values = data.map((d) => d[valueKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((d[valueKey] - min) / span) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="surface p-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="mt-5">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
          <polyline
            points={points}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
          <polygon points={`0,100 ${points} 100,100`} fill="var(--primary)" opacity="0.09" />
        </svg>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          {data.map((d, i) => (
            <span key={i}>{d.month || d.label}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Latest:{" "}
          <span className="font-semibold text-foreground">
            {values[values.length - 1]}
            {suffix}
          </span>{" "}
          · Peak:{" "}
          <span className="font-semibold text-foreground">
            {max}
            {suffix}
          </span>
        </p>
      </div>
    </div>
  );
}

export default LineChart;
