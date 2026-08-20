"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardShell({ user, usage, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lf-shell d-flex">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open ? <div className="lf-backdrop d-lg-none" onClick={() => setOpen(false)} /> : null}
      <div className="lf-main flex-grow-1 d-flex flex-column">
        <Topbar user={user} usage={usage} onToggleSidebar={() => setOpen((v) => !v)} />
        <main className="lf-content flex-grow-1">{children}</main>
      </div>
    </div>
  );
}
