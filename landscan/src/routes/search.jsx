import { createFileRoute } from "@tanstack/react-router";
import SearchRecords from "../pages/common/SearchRecords";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Land Records | BhoomiScan AI" },
      { name: "description", content: "Search digitized land records by owner, khasra number, survey number, village or district." },
      { property: "og:title", content: "Search Land Records | BhoomiScan AI" },
      { property: "og:description", content: "Search digitized land records by owner, khasra number, survey number, village or district." },
    ],
  }),
  component: SearchRecords,
});
