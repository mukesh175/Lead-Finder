"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import ScoreBadge from "@/components/ScoreBadge";
import { EmailStatusBadge, PhoneStatusBadge, LEAD_STATUSES } from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "@/components/Toast";

function Row({ label, children }) {
  return (
    <div className="row g-2 py-2 border-bottom">
      <div className="col-12 col-sm-4 lf-muted small text-uppercase fw-semibold" style={{ letterSpacing: ".05em" }}>
        {label}
      </div>
      <div className="col-12 col-sm-8 text-break">{children}</div>
    </div>
  );
}

export default function LeadDetailClient({ lead: initialLead }) {
  const router = useRouter();
  const toast = useToast();
  const [lead, setLead] = useState(initialLead);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const copy = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Clipboard is not available in this browser.");
    }
  };

  const changeStatus = async (leadStatus) => {
    try {
      const data = await apiRequest(`/api/leads/${lead.id}`, { method: "PATCH", body: { leadStatus } });
      setLead((current) => ({ ...current, leadStatus: data.lead.leadStatus }));
      toast.success("Status updated.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const checkPhone = async () => {
    setVerifying(true);
    try {
      const data = await apiRequest(`/api/leads/${lead.id}/verify-phone`, { method: "POST" });
      setLead((current) => ({ ...current, ...data.lead }));
      if (!data.provider.configured) {
        toast.info("No phone verification provider configured - status left as Not checked.");
      } else {
        toast.success(`Phone reported as ${data.lead.phoneStatus.replace("_", " ")}.`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setVerifying(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiRequest(`/api/leads/${lead.id}`, { method: "DELETE" });
      toast.success("Lead deleted.");
      router.push("/leads");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  const socials = [
    ["LinkedIn", lead.linkedinUrl],
    ["Facebook", lead.facebookUrl],
    ["Instagram", lead.instagramUrl],
    ["X / Twitter", lead.twitterUrl],
  ].filter(([, url]) => url);

  return (
    <>
      <PageHeader
        title={
          lead.companyName ||
          (lead.sourceType === "intent_post"
            ? lead.description || "Public request"
            : "Unknown company")
        }
        subtitle={
          lead.sourceType === "intent_post"
            ? "Someone publicly asked for this service - reply on the original post."
            : lead.description || "No public description found."
        }
        actions={
          <>
            <Link href="/leads" className="btn btn-light">
              Back to leads
            </Link>
            {lead.website ? (
              <a className="btn btn-light" href={lead.website} target="_blank" rel="noopener noreferrer nofollow">
                Open Website
              </a>
            ) : null}
            <a className="btn btn-light" href={lead.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
              Open Source
            </a>
            <button className="btn btn-outline-danger" onClick={() => setConfirmOpen(true)}>
              Delete Lead
            </button>
          </>
        }
      />

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="lf-card p-3 p-lg-4">
            <Row label={lead.sourceType === "intent_post" ? "Posted by" : "Company Name"}>
              {lead.companyName || (
                <span className="lf-muted">
                  {lead.sourceType === "intent_post"
                    ? "Not published on the post"
                    : "Not found"}
                </span>
              )}
            </Row>
            <Row label="Contact Person">
              {lead.name || <span className="lf-muted">No publicly associated person found</span>}
            </Row>
            <Row label="Website">
              {lead.website ? (
                <a href={lead.website} target="_blank" rel="noopener noreferrer nofollow">
                  {lead.website}
                </a>
              ) : (
                <span className="lf-muted">Not found</span>
              )}
            </Row>
            <Row label="Email">
              {lead.email ? (
                <span className="d-flex flex-wrap align-items-center gap-2">
                  <span>{lead.email}</span>
                  <EmailStatusBadge status={lead.emailStatus} />
                  <button className="btn btn-sm btn-light" onClick={() => copy(lead.email, "Email")}>
                    Copy Email
                  </button>
                </span>
              ) : (
                <span className="lf-muted">No public email found</span>
              )}
            </Row>
            <Row label="Phone">
              {lead.phone ? (
                <span className="d-flex flex-wrap align-items-center gap-2">
                  <span>{lead.phone}</span>
                  <PhoneStatusBadge status={lead.phoneStatus} lineType={lead.phoneLineType} />
                  {lead.phoneCarrier ? (
                    <span className="lf-muted small">{lead.phoneCarrier}</span>
                  ) : null}
                  <button className="btn btn-sm btn-light" onClick={() => copy(lead.phone, "Phone")}>
                    Copy Phone
                  </button>
                  <button className="btn btn-sm btn-light" onClick={checkPhone} disabled={verifying}>
                    {verifying ? "Checking..." : "Check if active"}
                  </button>
                </span>
              ) : (
                <span className="lf-muted">Not found</span>
              )}
            </Row>
            <Row label="Location">{lead.location || <span className="lf-muted">Not found</span>}</Row>
            <Row label="Contact Page">
              {lead.contactPageUrl ? (
                <a href={lead.contactPageUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {lead.contactPageUrl}
                </a>
              ) : (
                <span className="lf-muted">Not found</span>
              )}
            </Row>
            {lead.intentQuote ? (
              <Row label="What they asked for">
                <blockquote className="mb-1 fst-italic">&ldquo;{lead.intentQuote}&rdquo;</blockquote>
                <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="small">
                  Read the original post
                </a>
              </Row>
            ) : null}
            <Row label="Keyword">{lead.keyword}</Row>
            <Row label="Source URL">
              <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                {lead.sourceUrl}
              </a>
            </Row>
            <Row label="Discovered">{new Date(lead.createdAt).toLocaleString()}</Row>
            {socials.length > 0 ? (
              <Row label="Social Profiles">
                <div className="d-flex flex-wrap gap-2">
                  {socials.map(([label, url]) => (
                    <a key={label} className="btn btn-sm btn-light" href={url} target="_blank" rel="noopener noreferrer nofollow">
                      {label}
                    </a>
                  ))}
                </div>
              </Row>
            ) : null}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="lf-card p-3 p-lg-4 mb-3">
            <h2 className="h6 fw-semibold">Lead score</h2>
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="lf-stat-value">{lead.leadScore}</span>
              <ScoreBadge score={lead.leadScore} />
            </div>

            <label className="form-label small fw-semibold">Lead status</label>
            <select
              className="form-select"
              value={lead.leadStatus}
              onChange={(event) => changeStatus(event.target.value)}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="lf-card p-3 p-lg-4">
            <h2 className="h6 fw-semibold">How this was found</h2>
            <p className="lf-muted small">
              Contact details come from publicly accessible pages only. LeadFinder does not identify
              who searched for a keyword on a search engine.
            </p>
            <ul className="list-unstyled small mb-0">
              {lead.sources.map((source) => (
                <li key={source.id} className="border-top pt-2 mt-2">
                  <div className="fw-semibold">{source.method.replace(/_/g, " ")}</div>
                  <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="text-break">
                    {source.url}
                  </a>
                  <div className="lf-muted">{new Date(source.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this lead?"
        message="This permanently removes the lead and its source records."
        confirmLabel="Delete"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
