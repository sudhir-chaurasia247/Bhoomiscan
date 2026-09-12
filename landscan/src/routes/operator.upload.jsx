import { createFileRoute } from "@tanstack/react-router";
import UploadRecord from "../pages/operator/UploadRecord";

export const Route = createFileRoute("/operator/upload")({
  head: () => ({
    meta: [
      { title: "Upload Land Record | BhoomiScan AI" },
      { name: "description", content: "Drag and drop scanned PDF or image land records for OCR and AI-based field extraction." },
      { property: "og:title", content: "Upload Land Record | BhoomiScan AI" },
      { property: "og:description", content: "Drag and drop scanned PDF or image land records for OCR and AI-based field extraction." },
    ],
  }),
  component: UploadRecord,
});
