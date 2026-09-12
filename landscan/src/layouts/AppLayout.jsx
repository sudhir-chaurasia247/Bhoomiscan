import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

function AppLayout({ role, title, subtitle, children }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/" });
    else if (role && user.role !== role) navigate({ to: `/${user.role}/dashboard` });
  }, [ready, user, role, navigate]);

  if (!ready || !user || (role && user.role !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <Navbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
