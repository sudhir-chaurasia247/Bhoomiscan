import { createFileRoute } from "@tanstack/react-router";
import VerificationQueue from "../pages/verifier/VerificationQueue";

export const Route = createFileRoute("/verifier/queue")({
  head: () => ({
    meta: [
      { title: "Verification Queue | BhoomiScan AI" },
      {
        name: "description",
        content:
          "Pending land records sorted by priority and OCR confidence, ready for verifier review and approval.",
      },
      { property: "og:title", content: "Verification Queue | BhoomiScan AI" },
      {
        property: "og:description",
        content: "Pending land records sorted by priority and OCR confidence for verifier review.",
      },
    ],
  }),
  component: VerificationQueue,
});
