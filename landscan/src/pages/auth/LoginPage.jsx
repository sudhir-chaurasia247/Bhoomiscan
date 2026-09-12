import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Landmark,
  Lock,
  Mail,
  ShieldCheck,
  ScanLine,
  Sparkles,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ROLES = [
  { value: "operator", label: "Operator", hint: "Upload & digitize records" },
  { value: "verifier", label: "Verifier", hint: "Review & approve records" },
  { value: "admin", label: "Admin", hint: "Monitor system & users" },
];

const DEMO = {
  operator: "op.ramesh@gov.in",
  verifier: "vf.vaishali@gov.in",
  admin: "admin.meera@gov.in",
};

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("operator");
  const [email, setEmail] = useState(DEMO.operator);
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

 const submit = async (e) => {
  e.preventDefault();

  if (!email.trim() || !password.trim()) {
    setError("Please enter both email and password.");
    return;
  }

  try {
    setBusy(true);
    setError("");

    const user = await login(
      email.trim(),
      password,
      role
    );

    navigate({
      to: `/${user.role}/dashboard`,
    });
  } catch (err) {
    console.error(err);

    setError(
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      "Login failed"
    );
  } finally {
    setBusy(false);
  }
};

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--primary) 0, transparent 45%), radial-gradient(circle at 80% 70%, var(--info) 0, transparent 42%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Landmark className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-xl font-bold">BhoomiScan AI</p>
              <p className="text-xs text-sidebar-foreground/60">
                Directorate of Land Records · Digital India
              </p>
            </div>
          </div>

          <h2 className="mt-16 max-w-md font-display text-4xl font-bold leading-tight">
            AI-Powered Land Record Digitization &amp; Verification
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-sidebar-foreground/70">
            Digitize decades of handwritten and scanned land records with OCR, structure them with
            Gemini AI, validate automatically and verify through a trusted government workflow.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: ScanLine, text: "High-accuracy OCR for faded handwritten registers" },
              { icon: Sparkles, text: "Gemini AI converts raw text into structured land fields" },
              { icon: BadgeCheck, text: "Automated validation, duplicate & missing-field checks" },
              { icon: ShieldCheck, text: "Role-based verification with full audit trail" },
            ].map((f) => (
              <li key={f.text} className="flex items-start gap-3 text-sm text-sidebar-foreground/85">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-sidebar-accent">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-sidebar-border pt-6 text-sidebar-foreground/80">
          {[
            ["17,060", "Records digitized"],
            ["96.4%", "OCR accuracy"],
            ["36", "Districts live"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-2xl font-bold text-sidebar-foreground">{v}</p>
              <p className="text-[11px]">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">BhoomiScan AI</p>
              <p className="text-[11px] text-muted-foreground">Land Record Digitization</p>
            </div>
          </div>

          <div className="surface p-7">
            <h1 className="text-2xl font-bold tracking-tight">Officer Sign In</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your government-issued credentials to access the portal.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gov.in"
                    className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Select Role
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRole(r.value);
                        setEmail(DEMO[r.value]);
                      }}
                      className={`rounded-lg border p-3 text-left transition ${
                        role === r.value
                          ? "border-primary bg-primary-soft ring-4 ring-primary/10"
                          : "border-input bg-card hover:bg-secondary"
                      }`}
                    >
                      <p className="text-sm font-semibold">{r.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {r.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
              >
                {busy ? "Signing in..." : "Login to Portal"}
                {!busy ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              Connected to BhoomiScan AI backend.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 Directorate of Land Records · Smart India Hackathon Prototype
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
