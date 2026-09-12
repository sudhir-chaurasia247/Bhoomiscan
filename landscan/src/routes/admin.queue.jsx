import { createFileRoute } from "@tanstack/react-router";
import VerificationQueue from "../pages/verifier/VerificationQueue";

export const Route = createFileRoute("/admin/queue")({
  head: () => ({
    meta: [
      { title: "Verification Queue Oversight | BhoomiScan AI" },
      {
        name: "description",
        content:
          "Administrator view of the state-wide verification queue with priority and confidence filters.",
      },
      { property: "og:title", content: "Verification Queue Oversight | BhoomiScan AI" },
      {
        property: "og:description",
        content: "Administrator oversight of the state-wide land record verification queue.",
      },
    ],
  }),
  component: AdminQueue,
});

function AdminQueue() {
  return <VerificationQueue role="admin" />;
}
