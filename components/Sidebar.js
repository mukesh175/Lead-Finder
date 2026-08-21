"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/find-leads", label: "Find Leads", icon: "✦" },
  { href: "/leads", label: "Leads", icon: "☰" },
  { href: "/verify", label: "Verify Phone", icon: "✆" },
  { href: "/searches", label: "Search History", icon: "⏱" },
  { href: "/keywords", label: "Keywords", icon: "#" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ open, onNavigate }) {
  const pathname = usePathname();

  return (
    <aside className={`lf-sidebar p-3 d-flex flex-column ${open ? "is-open" : ""}`}>
      <Link href="/dashboard" className="lf-brand fs-5 px-2 py-2 d-block" onClick={onNavigate}>
        Lead<span style={{ color: "#a5b4fc" }}>Finder</span>
      </Link>
      <nav className="nav flex-column mt-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link d-flex align-items-center gap-2 ${active ? "active" : ""}`}
              onClick={onNavigate}
            >
              <span style={{ width: 18, display: "inline-block" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto small px-2 pb-2" style={{ color: "#7c8aa8" }}>
        LeadFinder discovers publicly available business contact information only.
      </div>
    </aside>
  );
}
