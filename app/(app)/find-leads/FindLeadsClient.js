"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import SearchForm from "@/components/SearchForm";
import SearchProgress from "@/components/SearchProgress";
import LeadCard from "@/components/LeadCard";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "@/components/Toast";

const MAX_BATCHES = 200; // Safety stop so a stuck job cannot loop forever.

export default function FindLeadsClient({ provider, budget, sourceGroups, savedKeywords, defaults }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState(null);
  const [percent, setPercent] = useState(0);
  const [running, setRunning] = useState(false);
  const [leads, setLeads] = useState([]);
  const [prefill, setPrefill] = useState(defaults);
  const cancelled = useRef(false);
  const budgetSpent = Boolean(budget && budget.remaining === 0);

  const loadLeads = useCallback(async (searchId) => {
    try {
      const data = await apiRequest(
        `/api/leads?searchId=${encodeURIComponent(searchId)}&pageSize=25&sort=leadScore&dir=desc`
      );
      setLeads(data.leads);
    } catch {
      /* the leads page remains the source of truth */
    }
  }, []);

  // The job is driven in small batches so no single request runs long.
  const drive = useCallback(
    async (searchId) => {
      for (let i = 0; i < MAX_BATCHES; i += 1) {
        if (cancelled.current) return;
        const data = await apiRequest(`/api/search/${searchId}/run`, { method: "POST" });
        setSearch(data.search);
        setPercent(data.percent);
        if (i % 2 === 1) await loadLeads(searchId);
        if (data.done) {
          await loadLeads(searchId);
          if (data.search.status === "FAILED") toast.error(data.search.error || "Search failed.");
          else toast.success(`Search complete · ${data.search.stats?.saved ?? 0} new leads saved.`);
          return;
        }
      }
      toast.info("Search paused after the maximum number of batches.");
    },
    [loadLeads, toast]
  );

  const start = async (input) => {
    cancelled.current = false;
    setRunning(true);
    setLeads([]);
    setPercent(0);
    setSearch(null);
    try {
      const data = await apiRequest("/api/search", { method: "POST", body: input });
      setSearch(data.search);
      // Refreshes the daily quota badge and the free-tier meter.
      router.refresh();
      if (data.search.resultsFound === 0) {
        setPercent(100);
        toast.info("No results were returned for that keyword. Try a broader keyword.");
      } else {
        await drive(data.search.id);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Find leads"
        subtitle="Enter any keyword. Add a location to focus the search, or leave it empty to search globally."
      />

      {!provider.configured ? (
        <div className="alert alert-warning">
          The <strong>{provider.label}</strong> provider is selected but not fully configured. Set the
          provider keys in your environment, or run with <code>SEARCH_PROVIDER=mock</code> during
          development.
        </div>
      ) : budget ? (
        <div className={`alert ${budget.remaining === 0 ? "alert-danger" : "alert-light border"}`}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <strong>{provider.label} free tier:</strong> {budget.used} / {budget.limit} search API
              calls used this {budget.period}
              {budget.remaining > 0 ? (
                <span className="lf-muted">
                  {" "}
                  - about {budget.resultsRemaining} more leads available before it resets.
                </span>
              ) : (
                <span> - searching is paused until the allowance resets ({budget.resetsAt}).</span>
              )}
            </div>
            <div className="progress" style={{ width: 160, height: 8 }}>
              <div
                className={`progress-bar ${budget.remaining === 0 ? "bg-danger" : ""}`}
                style={{ width: `${Math.min(100, (budget.used / budget.limit) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : provider.name === "mock" ? (
        <div className="alert alert-info">
          Running with the <strong>mock search provider</strong>. Results are generated development
          data, not live web results. Set <code>SEARCH_PROVIDER=google</code> with your API keys for
          real searches.
        </div>
      ) : null}

      <SearchForm
        defaults={prefill}
        sourceGroups={sourceGroups}
        disabled={running || budgetSpent}
        busyLabel={running ? "Searching..." : "Quota reached"}
        onSubmit={start}
        key={prefill.keyword}
      />

      {savedKeywords.length > 0 ? (
        <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
          <span className="lf-muted small">Saved keywords:</span>
          {savedKeywords.map((item) => (
            <button
              key={item.id}
              type="button"
              className="btn btn-sm btn-light border"
              disabled={running}
              onClick={() => setPrefill({ ...defaults, keyword: item.keyword, location: item.location || "" })}
            >
              {item.keyword}
            </button>
          ))}
          <Link href="/keywords" className="small ms-1">
            Manage
          </Link>
        </div>
      ) : null}

      {search ? (
        <div className="mt-4">
          <SearchProgress search={search} percent={percent} />
        </div>
      ) : null}

      {leads.length > 0 ? (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 fw-semibold mb-0">Leads from this search</h2>
            <div className="d-flex gap-2">
              <a
                className="btn btn-sm btn-light"
                href={`/api/leads/export?searchId=${encodeURIComponent(search.id)}`}
              >
                Export this search
              </a>
              <Link className="btn btn-sm btn-primary" href={`/leads?searchId=${search.id}`}>
                Open in Leads
              </Link>
            </div>
          </div>
          <div className="row g-3">
            {leads.map((lead) => (
              <div className="col-12 col-md-6 col-xl-4" key={lead.id}>
                <LeadCard lead={lead} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
