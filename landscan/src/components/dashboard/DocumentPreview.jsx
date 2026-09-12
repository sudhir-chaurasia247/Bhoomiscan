import { FileText, ZoomIn, Download } from "lucide-react";

function DocumentPreview({ title = "Original Document", fileName = "land_record_1058.pdf", page = "Page 1 of 2" }) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {fileName} · {page}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button className="rounded-lg border border-input p-2 text-muted-foreground transition hover:bg-secondary" aria-label="Zoom">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-input p-2 text-muted-foreground transition hover:bg-secondary" aria-label="Download">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-6">
          <p className="text-center font-display text-sm font-bold tracking-wide text-muted-foreground">
            VILLAGE FORM VII · RECORD OF RIGHTS
          </p>
          <div className="mt-5 space-y-3">
            {[90, 70, 100, 60, 85, 45, 95, 72, 88].map((w, i) => (
              <div key={i} className="h-2.5 rounded bg-muted-foreground/20" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Scanned at 300 DPI
            </span>
            <span>Grayscale</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentPreview;
