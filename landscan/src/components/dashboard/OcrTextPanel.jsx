function highlight(text, lowConfidenceTokens) {
  let parts = [text];
  (lowConfidenceTokens || []).forEach((token) => {
    parts = parts.flatMap((part) =>
      typeof part === "string" && part.includes(token)
        ? part.split(token).flatMap((seg, i) => (i === 0 ? [seg] : [{ token }, seg]))
        : [part],
    );
  });
  return parts;
}

function OcrTextPanel({ text = "", lowConfidenceTokens = [] }) {
  const parts = highlight(text, lowConfidenceTokens);
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="text-sm font-semibold">OCR Extracted Raw Text</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm bg-warning/50" />
          Low confidence
        </span>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-foreground">
        {parts.map((p, i) =>
          typeof p === "string" ? (
            <span key={i}>{p}</span>
          ) : (
            <mark key={i} className="rounded bg-warning/35 px-1 text-warning-foreground">
              {p.token}
            </mark>
          ),
        )}
      </pre>
    </div>
  );
}

export default OcrTextPanel;
