import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "../pages/admin/AdminDashboard";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | BhoomiScan AI" },
      { name: "description", content: "State-wide land record digitization progress, district statistics, accuracy metrics and activity feed." },
      { property: "og:title", content: "Admin Dashboard | BhoomiScan AI" },
      { property: "og:description", content: "State-wide land record digitization progress, district statistics, accuracy metrics and activity feed." },
    ],
  }),
  component: AdminDashboard,
});
