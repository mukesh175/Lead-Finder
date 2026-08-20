"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const LIMITS = [10, 25, 50, 100];

/**
 * Working search form on the landing page. Signed-in visitors land straight on
 * the search page with their input carried over; everyone else is sent to
 * registration and returned here afterwards.
 */
export default function HeroSearch({ signedIn }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      setError("Enter a keyword with at least 2 characters.");
      return;
    }
    setError(null);

    const params = new URLSearchParams({ keyword: trimmed, limit: String(limit) });
    if (location.trim()) params.set("location", location.trim());
    const target = `/find-leads?${params.toString()}`;

    router.push(signedIn ? target : `/register?next=${encodeURIComponent(target)}`);
  };

  return (
    <form className="lf-card p-3 p-md-4 mt-5 text-start" onSubmit={submit}>
      <div className="row g-3 align-items-end">
        <div className="col-12 col-md-5">
          <label className="form-label small lf-muted mb-1" htmlFor="hero-keyword">
            Keyword
          </label>
          <input
            id="hero-keyword"
            className="form-control"
            placeholder="e.g. Shopify developer, dental clinic, SEO agency"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            maxLength={120}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label small lf-muted mb-1" htmlFor="hero-location">
            Location (optional)
          </label>
          <input
            id="hero-location"
            className="form-control"
            placeholder="Global"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={120}
          />
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1" htmlFor="hero-limit">
            Leads
          </label>
          <select
            id="hero-limit"
            className="form-select"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-2">
          <button type="submit" className="btn btn-primary w-100">
            Find Leads
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div> : null}

      {!signedIn ? (
        <p className="lf-muted small mb-0 mt-3">
          You&apos;ll create a free account first - your keyword is carried straight through to the
          search.
        </p>
      ) : null}
    </form>
  );
}
