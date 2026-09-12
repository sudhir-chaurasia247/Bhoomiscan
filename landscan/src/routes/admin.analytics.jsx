import { createFileRoute } from "@tanstack/react-router";
import Analytics from "../pages/admin/Analytics";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics | BhoomiScan AI" },
      { name: "description", content: "OCR accuracy, AI extraction accuracy, verification rate and district performance analytics." },
      { property: "og:title", content: "Analytics | BhoomiScan AI" },
      { property: "og:description", content: "OCR accuracy, AI extraction accuracy, verification rate and district performance analytics." },
    ],
  }),
  component: Analytics,
});
