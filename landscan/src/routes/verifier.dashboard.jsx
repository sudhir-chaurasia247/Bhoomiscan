import { createFileRoute } from "@tanstack/react-router";
import VerifierDashboard from "../pages/verifier/VerifierDashboard";

export const Route = createFileRoute("/verifier/dashboard")({
  head: () => ({
    meta: [
      { title: "Verifier Dashboard | BhoomiScan AI" },
      { name: "description", content: "Monitor your verification queue, approvals, rejections and review performance." },
      { property: "og:title", content: "Verifier Dashboard | BhoomiScan AI" },
      { property: "og:description", content: "Monitor your verification queue, approvals, rejections and review performance." },
    ],
  }),
  component: VerifierDashboard,
});
