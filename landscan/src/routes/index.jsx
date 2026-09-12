import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "../pages/auth/LoginPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BhoomiScan AI — Secure Login for Land Record Digitization" },
      {
        name: "description",
        content:
          "Sign in to BhoomiScan AI, the AI-powered land record digitization, OCR extraction and verification portal for operators, verifiers and administrators.",
      },
      { property: "og:title", content: "BhoomiScan AI — Land Record Digitization Portal" },
      {
        property: "og:description",
        content:
          "AI-powered OCR extraction, validation and verification of handwritten and scanned land records.",
      },
    ],
  }),
  component: LoginPage,
});
