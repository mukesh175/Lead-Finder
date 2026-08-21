"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Filters from "@/components/Filters";
import LeadTable from "@/components/LeadTable";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "@/components/Toast";

const BASE_FILTERS = {
  q: "",
  keyword: "",
  location: "",
  country: "",
  minScore: "",
  hasEmail: "any",
  emailStatus: "any",
  phoneStatus: "any",
  sourceType: "any",
  leadStatus: "any",
  searchId: "",
  from: "",
  to: "",
  sort: "createdAt",
  dir: "desc",
  page: 1,
  pageSize: 25,
};

function toQuery(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === "" || value === null || value === undefined) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export default function LeadsClient({ keywords, initialFilters }) {
  const toast = useToast();
  const [filters, setFilters] = useState({ ...BASE_FILTERS, ...initialFilters });
  const [data, setData] = useState({ leads: [], pagination: { page: 1, totalPages: 1, total: 0, pageSize: 25 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => toQuery(filters), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiRequest(`/api/leads?${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // Debounced so typing in the filter inputs does not hammer the API.
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const changeStatus = async (id, leadStatus) => {
    try {
      await apiRequest(`/api/leads/${id}`, { method: "PATCH", body: { leadStatus } });
      setData((current) => ({
        ...current,
        leads: current.leads.map((lead) => (lead.id === id ? { ...lead, leadStatus } : lead)),
      }));
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const runBulk = async (action, leadStatus) => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const result = await apiRequest("/api/leads", {
        method: "PATCH",
        body: { ids: selected, action, leadStatus },
      });
      toast.success(
        action === "delete"
          ? `${result.deleted} lead(s) deleted.`
          : action === "verify_phone"
            ? `${result.checked} phone number(s) checked.`
            : `${result.updated} lead(s) updated.`
      );
      setSelected([]);
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (lead) => {
    setBusy(true);
    try {
      await apiRequest(`/api/leads/${lead.id}`, { method: "DELETE" });
      toast.success("Lead deleted.");
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportUrl = (extra = {}) => {
    const params = { ...filters, ...extra };
    delete params.page;
    return `/api/leads/export?${toQuery(params)}`;
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Every lead keeps the keyword that discovered it and the public source it came from."
        actions={
          <>
            <a className="btn btn-light" href={exportUrl()}>
              Export current view
            </a>
            <a className="btn btn-light" href={exportUrl({ minScore: 80 })}>
              Export hot leads
            </a>
            <a
              className="btn btn-light"
              href={`/api/leads/export?ids=${selected.join(",")}`}
              onClick={(event) => {
                if (selected.length === 0) {
                  event.preventDefault();
                  toast.info("Select at least one lead first.");
                }
              }}
            >
              Export selected ({selected.length})
            </a>
          </>
        }
      />

      <Filters
        value={filters}
        keywords={keywords}
        onChange={setFilters}
        onReset={() => {
          setFilters({ ...BASE_FILTERS });
          setSelected([]);
        }}
      />

      {selected.length > 0 ? (
        <div className="lf-card p-2 px-3 mb-3 d-flex flex-wrap align-items-center gap-2">
          <span className="small fw-semibold">{selected.length} selected</span>
          <select
            className="form-select form-select-sm w-auto"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) runBulk("status", event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Change status to...</option>
            {["NEW", "CONTACTED", "REPLIED", "QUALIFIED", "CONVERTED", "NOT_INTERESTED", "ARCHIVED"].map(
              (status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              )
            )}
          </select>
          <button
            className="btn btn-sm btn-light"
            onClick={() => runBulk("verify_phone")}
            disabled={busy}
            title="Checks each selected lead's number against the phone validation provider"
          >
            Check phones
          </button>
          <button
            className="btn btn-sm btn-outline-danger ms-auto"
            onClick={() =>
              setConfirm({
                title: "Delete selected leads?",
                message: `${selected.length} lead(s) will be permanently removed.`,
                onConfirm: () => runBulk("delete"),
              })
            }
          >
            Delete selected
          </button>
        </div>
      ) : null}

      <div className="lf-card">
        {loading ? (
          <div className="p-4">
            {[...Array(6)].map((_, index) => (
              <div className="lf-skeleton mb-2" style={{ height: 42 }} key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="alert alert-danger mb-3">{error}</div>
            <button className="btn btn-light" onClick={load}>
              Try again
            </button>
          </div>
        ) : data.leads.length === 0 ? (
          <EmptyState
            title="No leads match these filters"
            message="Adjust the filters, or run a new keyword search to add leads."
          />
        ) : (
          <>
            <LeadTable
              leads={data.leads}
              selected={selected}
              onToggle={(id) =>
                setSelected((current) =>
                  current.includes(id) ? current.filter((v) => v !== id) : [...current, id]
                )
              }
              onToggleAll={(checked) => setSelected(checked ? data.leads.map((l) => l.id) : [])}
              sort={filters.sort}
              dir={filters.dir}
              onSort={(field) =>
                setFilters((current) => ({
                  ...current,
                  sort: field,
                  dir: current.sort === field && current.dir === "desc" ? "asc" : "desc",
                  page: 1,
                }))
              }
              onStatusChange={changeStatus}
              onDelete={(lead) =>
                setConfirm({
                  title: "Delete this lead?",
                  message: `${lead.companyName || "This lead"} will be permanently removed.`,
                  onConfirm: () => deleteOne(lead),
                })
              }
            />
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              pageSize={data.pagination.pageSize}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
              onPageSizeChange={(pageSize) => setFilters((current) => ({ ...current, pageSize, page: 1 }))}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
