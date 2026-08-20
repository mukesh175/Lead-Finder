"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "@/components/Toast";

function Status({ connected, label }) {
  return connected ? (
    <span className="badge text-bg-success">Connected ✓</span>
  ) : (
    <span className="badge text-bg-secondary" title={label}>
      Not configured
    </span>
  );
}

export default function SettingsClient({ user, integrations, limits, scoreWeights, usage, budget }) {
  const toast = useToast();
  const [form, setForm] = useState(user);
  const [busy, setBusy] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest("/api/settings", {
        method: "PATCH",
        body: {
          name: form.name,
          defaultLimit: Number(form.defaultLimit),
          defaultLocation: form.defaultLocation,
        },
      });
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Search defaults, integrations and account limits." />

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <form className="lf-card p-3 p-lg-4" onSubmit={save}>
            <h2 className="h6 fw-semibold mb-3">Search</h2>

            <div className="mb-3">
              <label className="form-label" htmlFor="defaultLimit">
                Default result count
              </label>
              <select
                id="defaultLimit"
                className="form-select"
                value={form.defaultLimit}
                onChange={(event) => setForm({ ...form, defaultLimit: event.target.value })}
              >
                {[10, 25, 50, 100]
                  .filter((value) => value <= limits.maxResultsPerSearch)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="defaultLocation">
                Default location <span className="lf-muted">(optional)</span>
              </label>
              <input
                id="defaultLocation"
                className="form-control"
                placeholder="Leave empty to search globally"
                value={form.defaultLocation}
                onChange={(event) => setForm({ ...form, defaultLocation: event.target.value })}
                maxLength={120}
              />
            </div>

            <hr className="my-4" />
            <h2 className="h6 fw-semibold mb-3">Account</h2>

            <div className="mb-3">
              <label className="form-label" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                className="form-control"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={80}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Email</label>
              <input className="form-control" value={user.email} disabled readOnly />
            </div>

            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save settings"}
            </button>
          </form>
        </div>

        <div className="col-12 col-lg-5">
          <div className="lf-card p-3 p-lg-4 mb-3">
            <h2 className="h6 fw-semibold mb-3">API integrations</h2>
            <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <div className="fw-semibold">Search provider</div>
                <div className="lf-muted small">{integrations.search.label}</div>
              </div>
              <Status connected={integrations.search.configured} label="Set SEARCH_API_KEY and SEARCH_ENGINE_ID" />
            </div>
            <div className="d-flex justify-content-between align-items-center py-2">
              <div>
                <div className="fw-semibold">Email verification</div>
                <div className="lf-muted small">{integrations.emailVerification.label}</div>
              </div>
              <Status
                connected={integrations.emailVerification.configured}
                label="Set EMAIL_VERIFICATION_API_KEY"
              />
            </div>
            <p className="lf-muted small mt-3 mb-0">
              API keys are read from server-side environment variables and are never displayed here.
            </p>
          </div>

          <div className="lf-card p-3 p-lg-4 mb-3">
            <h2 className="h6 fw-semibold mb-3">Limits</h2>
            <ul className="list-unstyled small mb-0">
              {budget ? (
                <li className="d-flex justify-content-between py-1">
                  <span className="lf-muted">
                    Search API calls this {budget.period} (free tier)
                  </span>
                  <strong className={budget.remaining === 0 ? "text-danger" : undefined}>
                    {budget.used} / {budget.limit}
                  </strong>
                </li>
              ) : null}
              <li className="d-flex justify-content-between py-1">
                <span className="lf-muted">Searches per day</span>
                <strong>
                  {usage.used} / {limits.searchesPerDay}
                </strong>
              </li>
              <li className="d-flex justify-content-between py-1">
                <span className="lf-muted">Max results per search</span>
                <strong>{limits.maxResultsPerSearch}</strong>
              </li>
              <li className="d-flex justify-content-between py-1">
                <span className="lf-muted">Max website pages per lead</span>
                <strong>{limits.maxPagesPerLead}</strong>
              </li>
              <li className="d-flex justify-content-between py-1">
                <span className="lf-muted">Request timeout</span>
                <strong>{limits.fetchTimeoutMs} ms</strong>
              </li>
            </ul>
            {budget ? (
              <p className="lf-muted small mt-3 mb-0">
                Searches are refused once the free-tier allowance is spent; it resets at{" "}
                {budget.resetsAt}.
              </p>
            ) : null}
          </div>

          <div className="lf-card p-3 p-lg-4">
            <h2 className="h6 fw-semibold mb-3">Lead scoring weights</h2>
            <ul className="list-unstyled small mb-0">
              {Object.entries(scoreWeights).map(([key, value]) => (
                <li className="d-flex justify-content-between py-1" key={key}>
                  <span className="lf-muted text-capitalize">
                    {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </span>
                  <strong>+{value}</strong>
                </li>
              ))}
            </ul>
            <p className="lf-muted small mt-3 mb-0">
              Weights are configured with environment variables (see the README).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
