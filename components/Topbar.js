"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "./Toast";

export default function Topbar({ user, usage, onToggleSidebar }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/leads?q=${encodeURIComponent(trimmed)}` : "/leads");
  };

  const signOut = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const initials = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <header className="lf-topbar px-3 px-lg-4 py-2 d-flex align-items-center gap-3">
      <button
        type="button"
        className="btn btn-light d-lg-none"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <form className="flex-grow-1" style={{ maxWidth: 420 }} onSubmit={submit} role="search">
        <input
          className="form-control"
          type="search"
          placeholder="Search your leads by company, name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search leads"
        />
      </form>

      <div className="ms-auto d-flex align-items-center gap-3">
        <span className="badge text-bg-light border d-none d-md-inline" title="Daily search quota">
          Today&apos;s searches: {usage?.used ?? 0} / {usage?.limit ?? 0}
        </span>

        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light d-flex align-items-center gap-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            <span
              className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
              style={{ width: 28, height: 28, fontSize: ".8rem" }}
            >
              {initials}
            </span>
            <span className="d-none d-md-inline small">{user?.name || user?.email}</span>
          </button>
          {menuOpen ? (
            <div
              className="lf-card position-absolute end-0 mt-2 p-2"
              style={{ minWidth: 200, zIndex: 30 }}
            >
              <div className="px-2 py-1 small lf-muted text-truncate">{user?.email}</div>
              <hr className="my-2" />
              <button className="btn btn-sm btn-light w-100 text-start" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
