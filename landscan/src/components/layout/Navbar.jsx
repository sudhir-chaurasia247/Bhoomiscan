import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu, UserRound } from "lucide-react";
import { ROLE_LABELS, useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import StatusBadge from "../ui/StatusBadge";

function Navbar({ title, subtitle, onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openBell, setOpenBell] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get("/notifications")
      .then((res) => {
        if (active) setNotifications(res.data.data.notifications);
      })
      .catch(() => {
        if (active) setNotifications([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            aria-label="Open menu"
            className="rounded-lg border border-input bg-card p-2 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              onClick={() => setOpenBell((v) => !v)}
              aria-label="Notifications"
              className="relative rounded-lg border border-input bg-card p-2.5 transition hover:bg-secondary"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            {openBell ? (
              <div className="surface absolute right-0 mt-2 w-80 overflow-hidden p-0">
                <p className="border-b border-border px-4 py-3 text-sm font-semibold">
                  Notifications
                </p>
                <ul>
                  {notifications.map((n) => (
                    <li key={n.title} className="border-b border-border px-4 py-3 last:border-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.detail} · {n.time}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-3 rounded-lg border border-input bg-card px-3 py-2 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <StatusBadge status={user?.role} label={ROLE_LABELS[user?.role]} />
          </div>

          <button
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2.5 text-sm font-semibold transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
