"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "@/components/Toast";

export default function KeywordsClient() {
  const toast = useToast();
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ keyword: "", location: "" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/keywords");
      setKeywords(data.keywords);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest("/api/keywords", { method: "POST", body: form });
      setForm({ keyword: "", location: "" });
      toast.success("Keyword saved.");
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (keyword) => {
    setBusy(true);
    try {
      await apiRequest(`/api/keywords?id=${encodeURIComponent(keyword.id)}`, { method: "DELETE" });
      toast.success("Keyword removed.");
      setConfirm(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Keywords"
        subtitle="Save the keywords you search often. Each lead keeps the keyword that discovered it."
      />

      <form className="lf-card p-3 mb-3" onSubmit={add}>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label small lf-muted mb-1">Keyword</label>
            <input
              className="form-control"
              placeholder="e.g. WordPress developer"
              value={form.keyword}
              onChange={(event) => setForm({ ...form, keyword: event.target.value })}
              maxLength={120}
              required
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small lf-muted mb-1">Default location (optional)</label>
            <input
              className="form-control"
              placeholder="Leave empty for global"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              maxLength={120}
            />
          </div>
          <div className="col-12 col-md-3">
            <button className="btn btn-primary w-100" type="submit" disabled={busy}>
              Save keyword
            </button>
          </div>
        </div>
      </form>

      <div className="lf-card">
        {loading ? (
          <div className="p-4">
            {[...Array(4)].map((_, index) => (
              <div className="lf-skeleton mb-2" style={{ height: 40 }} key={index} />
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <EmptyState
            icon="#"
            title="No saved keywords"
            message="Save a keyword above, or run a search - searched keywords are saved automatically."
          />
        ) : (
          <div className="table-responsive">
            <table className="table lf-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Default location</th>
                  <th>Leads</th>
                  <th>Last run</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((keyword) => (
                  <tr key={keyword.id}>
                    <td className="fw-semibold">{keyword.keyword}</td>
                    <td className="lf-muted">{keyword.location || "Global"}</td>
                    <td>{keyword.leadCount}</td>
                    <td className="lf-muted small">
                      {keyword.lastRunAt ? new Date(keyword.lastRunAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="text-end text-nowrap">
                      <Link
                        className="btn btn-sm btn-light me-1"
                        href={`/leads?keyword=${encodeURIComponent(keyword.keyword)}`}
                      >
                        View leads
                      </Link>
                      <Link className="btn btn-sm btn-primary me-1" href="/find-leads">
                        Search
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() =>
                          setConfirm({
                            keyword,
                            message: `"${keyword.keyword}" will be removed from your saved keywords. Existing leads are kept.`,
                          })
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove keyword?"
        message={confirm?.message}
        confirmLabel="Remove"
        busy={busy}
        onConfirm={() => remove(confirm.keyword)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
