import { createFileRoute } from "@tanstack/react-router";
import UserManagement from "../pages/admin/UserManagement";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management | BhoomiScan AI" },
      { name: "description", content: "Add, edit and disable operator, verifier and administrator accounts across districts." },
      { property: "og:title", content: "User Management | BhoomiScan AI" },
      { property: "og:description", content: "Add, edit and disable operator, verifier and administrator accounts across districts." },
    ],
  }),
  component: UserManagement,
});
