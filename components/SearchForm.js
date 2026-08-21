"use client";

import { useState } from "react";

const LIMITS = [10, 25, 50, 100];

const MODES = [
  {
    id: "business",
    title: "Businesses offering it",
    hint: "Companies and professionals who provide this service - their public contact details.",
  },
  {
    id: "intent",
    title: "People asking for it",
    hint: "Public posts where someone says they need this service right now.",
  },
];

export default function SearchForm({
  defaults = {},
  sourceGroups = {},
  disabled = false,
  busyLabel = "Searching...",
  onSubmit,
}) {
  const [keyword, setKeyword] = useState(defaults.keyword || "");
  const [location, setLocation] = useState(defaults.location || "");
  const [limit, setLimit] = useState(defaults.limit || 25);
  const [mode, setMode] = useState(defaults.mode || "business");
  const [sources, setSources] = useState(Object.keys(sourceGroups));
  const [error, setError] = useState(null);

  const toggleSource = (key) =>
    setSources((current) =>
      current.includes(key) ? current.filter((v) => v !== key) : [...current, key]
    );

  const submit = (event) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      setError("Enter a keyword with at least 2 characters.");
      return;
    }
    if (mode === "intent" && sources.length === 0) {
      setError("Choose at least one source to search.");
      return;
    }
    setError(null);
    onSubmit({
      keyword: trimmed,
      location: location.trim(),
      limit: Number(limit),
      mode,
      sources: mode === "intent" ? sources : [],
    });
  };

  return (
    <form className="lf-card p-4" onSubmit={submit}>
      <div className="row g-2 mb-3">
        {MODES.map((option) => (
          <div className="col-12 col-md-6" key={option.id}>
            <label
              className={`d-block h-100 p-3 border rounded-3 ${
                mode === option.id ? "border-primary bg-primary-subtle" : "border-light-subtle"
              }`}
              style={{ cursor: disabled ? "not-allowed" : "pointer" }}
            >
              <span className="d-flex align-items-center gap-2">
                <input
                  type="radio"
                  className="form-check-input mt-0"
                  name="search-mode"
                  checked={mode === option.id}
                  onChange={() => setMode(option.id)}
                  disabled={disabled}
                />
                <span className="fw-semibold">{option.title}</span>
              </span>
              <span className="lf-muted small d-block mt-1">{option.hint}</span>
            </label>
          </div>
        ))}
      </div>

      {mode === "intent" ? (
        <div className="mb-3">
          <div className="lf-muted small mb-2">Search these public sources:</div>
          <div className="d-flex flex-wrap gap-3">
            {Object.entries(sourceGroups).map(([key, group]) => (
              <div className="form-check" key={key}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`source-${key}`}
                  checked={sources.includes(key)}
                  onChange={() => toggleSource(key)}
                  disabled={disabled}
                />
                <label className="form-check-label" htmlFor={`source-${key}`}>
                  {group.label}
                  <span className="lf-muted small d-block">{group.hint}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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

        <div className="col-12 col-lg-3">
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

        <div className="col-6 col-lg-2">
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
            {disabled ? busyLabel : "Find Leads"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div> : null}

      <p className="lf-muted small mt-3 mb-0">
        {mode === "intent"
          ? "Finds people who publicly posted that they need this service, and stores the exact post as proof. Search engines never reveal who typed a query, so nobody can be identified from a private search."
          : "Searches publicly accessible web pages and business listings. It never identifies who searched a keyword on a search engine."}
      </p>
    </form>
  );
}
