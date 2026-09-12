import { createFileRoute } from "@tanstack/react-router";
import ReviewRecord from "../pages/verifier/ReviewRecord";

export const Route = createFileRoute("/verifier/review")({
  validateSearch: (search) => ({
    recordId: search.recordId ?? "",
  }),

  head: () => ({
    meta: [
      { title: "Review Land Record | BhoomiScan AI" },
      {
        name: "description",
        content:
          "Review OCR text against editable structured fields, add notes, approve or reject a land record.",
      },
      {
        property: "og:title",
        content: "Review Land Record | BhoomiScan AI",
      },
      {
        property: "og:description",
        content:
          "Review OCR text against editable structured fields, add notes, approve or reject a land record.",
      },
    ],
  }),

  component: ReviewRecord,
});