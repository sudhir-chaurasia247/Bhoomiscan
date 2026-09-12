import { createFileRoute } from "@tanstack/react-router";
import MyUploads from "../pages/operator/MyUploads";

export const Route = createFileRoute("/operator/uploads")({
  head: () => ({
    meta: [
      { title: "My Uploads | BhoomiScan AI" },
      { name: "description", content: "Search and filter the full history of land records you have digitized and submitted." },
      { property: "og:title", content: "My Uploads | BhoomiScan AI" },
      { property: "og:description", content: "Search and filter the full history of land records you have digitized and submitted." },
    ],
  }),
  component: MyUploads,
});
