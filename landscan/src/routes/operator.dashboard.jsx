import { createFileRoute } from "@tanstack/react-router";
import OperatorDashboard from "../pages/operator/OperatorDashboard";

export const Route = createFileRoute("/operator/dashboard")({
  head: () => ({
    meta: [
      { title: "Operator Dashboard | BhoomiScan AI" },
      { name: "description", content: "Track uploads, pending verifications and monthly digitization statistics for scanned land records." },
      { property: "og:title", content: "Operator Dashboard | BhoomiScan AI" },
      { property: "og:description", content: "Track uploads, pending verifications and monthly digitization statistics for scanned land records." },
    ],
  }),
  component: OperatorDashboard,
});
