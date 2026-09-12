import { createFileRoute } from "@tanstack/react-router";
import OcrProcessing from "../pages/operator/OcrProcessing";

export const Route = createFileRoute("/operator/processing")({
  head: () => ({
    meta: [
      { title: "OCR Processing | BhoomiScan AI" },
      { name: "description", content: "Live progress of OCR text extraction, Gemini AI structuring and automated validation." },
      { property: "og:title", content: "OCR Processing | BhoomiScan AI" },
      { property: "og:description", content: "Live progress of OCR text extraction, Gemini AI structuring and automated validation." },
    ],
  }),
  component: OcrProcessing,
});
