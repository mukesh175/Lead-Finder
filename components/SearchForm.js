"use client";

import { useState } from "react";

const LIMITS = [10, 25, 50, 100];

export default function SearchForm({ defaults = {}, disabled = false, onSubmit }) {
  const [keyword, setKeyword] = useState(defaults.keyword || "");
  const [location, setLocation] = useState(defaults.location || "");
  const [limit, setLimit] = useState(defaults.limit || 25);
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      setError("Enter a keyword with at least 2 characters.");
      return;
    }
    setError(null);
    onSubmit({ keyword: trimmed, location: location.trim(), limit: Number(limit) });
  };

  return (
    <form className="lf-card p-4" onSubmit={submit}>
      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <label className="form-label fw-semibold" htmlFor="keyword">
            Keyword
          </label>
          <input
            id="keyword"
            className="form-control form-control-lg"
            placeholder="e.g. Shopify developer, dental clinic, SEO agency"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            maxLength={120}
            disabled={disabled}
          />
        </div>

        <div className="col-12 col-lg-4">
          <label className="form-label fw-semibold" htmlFor="location">
            Location <span className="lf-muted fw-normal">(optional)</span>
          </label>
          <input
            id="location"
            className="form-control form-control-lg"
            placeholder="USA, London, Dubai... leave empty to search globally"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={120}
            disabled={disabled}
          />
        </div>

        <div className="col-6 col-lg-1">
          <label className="form-label fw-semibold" htmlFor="limit">
            Leads
          </label>
          <select
            id="limit"
            className="form-select form-select-lg"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            disabled={disabled}
          >
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-lg-2 d-flex align-items-end">
          <button type="submit" className="btn btn-primary btn-lg w-100" disabled={disabled}>
            {disabled ? "Searching..." : "Find Leads"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div> : null}

      <p className="lf-muted small mt-3 mb-0">
        LeadFinder searches publicly accessible web pages and business listings. It never identifies
        who searched a keyword on a search engine.
      </p>
    </form>
  );
}
