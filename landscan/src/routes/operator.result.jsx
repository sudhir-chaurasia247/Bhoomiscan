import { createFileRoute } from "@tanstack/react-router";
import OcrResult from "../pages/operator/OcrResult";

export const Route = createFileRoute("/operator/result")({
  head: () => ({
    meta: [
      { title: "OCR Result | BhoomiScan AI" },
      { name: "description", content: "Compare the original scan with AI structured land record fields, confidence scores and validation warnings." },
      { property: "og:title", content: "OCR Result | BhoomiScan AI" },
      { property: "og:description", content: "Compare the original scan with AI structured land record fields, confidence scores and validation warnings." },
    ],
  }),
  component: OcrResult,
});
