import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  ScanLine,
  FileCheck2,
  FolderOpen,
  Search,
  ClipboardList,
  FileSearch2,
  Users,
  BarChart3,
  Landmark,
  X,
} from "lucide-react";
import { ROLE_LABELS } from "../../context/AuthContext";

export const MENUS = {
  operator: [
    { to: "/operator/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/operator/upload", label: "Upload Record", icon: Upload },
    { to: "/operator/processing", label: "OCR Processing", icon: ScanLine },
    { to: "/operator/result", label: "OCR Result", icon: FileCheck2 },
    { to: "/operator/uploads", label: "My Uploads", icon: FolderOpen },
    { to: "/search", label: "Search Records", icon: Search },
  ],
  verifier: [
    { to: "/verifier/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/verifier/queue", label: "Verification Queue", icon: ClipboardList },
    { to: "/verifier/review", label: "Review Record", icon: FileSearch2 },
    { to: "/search", label: "Search Records", icon: Search },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "User Management", icon: Users },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/queue", label: "Verification Queue", icon: ClipboardList },
    { to: "/search", label: "Search Records", icon: Search },
  ],
};

function Sidebar({ role, open, onClose }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = MENUS[role] || MENUS.operator;

  return (
    <>
      {open ? (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-tight">BhoomiScan AI</p>
              <p className="text-[11px] text-sidebar-foreground/60">Land Record Digitization</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/45">
            {ROLE_LABELS[role]} workspace
          </p>
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_var(--primary)]"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4 text-[11px] leading-relaxed text-sidebar-foreground/55">
          Government of India · Digital India Initiative
          <br />
          OCR + Gemini AI pipeline · v1.4.0
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
