"use client";

import Link from "next/link";
import ScoreBadge from "./ScoreBadge";
import { EmailStatusBadge, PhoneStatusBadge, LEAD_STATUSES } from "./StatusBadge";

const COLUMNS = [
  ["companyName", "Company"],
  [null, "Contact"],
  ["email", "Email"],
  [null, "Phone"],
  ["location", "Location"],
  ["keyword", "Keyword"],
  ["leadScore", "Score"],
  ["leadStatus", "Status"],
  [null, "Source"],
  ["createdAt", "Created"],
];

export default function LeadTable({
  leads,
  selected,
  onToggle,
  onToggleAll,
  sort,
  dir,
  onSort,
  onStatusChange,
  onDelete,
}) {
  const allSelected = leads.length > 0 && leads.every((lead) => selected.includes(lead.id));

  return (
    <div className="table-responsive">
      <table className="table lf-table align-middle">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <input
                className="form-check-input"
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleAll(event.target.checked)}
                aria-label="Select all leads on this page"
              />
            </th>
            {COLUMNS.map(([field, label]) => (
              <th key={label}>
                {field ? (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-reset"
                    onClick={() => onSort(field)}
                  >
                    {label}
                    {sort === field ? <span className="ms-1">{dir === "asc" ? "▲" : "▼"}</span> : null}
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={selected.includes(lead.id)}
                  onChange={() => onToggle(lead.id)}
                  aria-label={`Select ${lead.companyName || "lead"}`}
                />
              </td>
              <td>
                <Link href={`/leads/${lead.id}`} className="fw-semibold text-reset d-block lf-truncate">
                  {lead.companyName || (lead.sourceType === "intent_post" ? "Public request" : "Unknown company")}
                </Link>
                {lead.intentQuote ? (
                  <span className="badge text-bg-success-subtle text-success-emphasis">
                    Asked for this
                  </span>
                ) : null}
                {lead.website ? (
                  <span className="lf-muted small d-block lf-truncate">{lead.website}</span>
                ) : null}
              </td>
              <td className="lf-truncate">{lead.name || <span className="lf-muted">—</span>}</td>
              <td>
                {lead.email ? (
                  <div className="d-flex flex-column">
                    <span className="lf-truncate">{lead.email}</span>
                    <span className="mt-1">
                      <EmailStatusBadge status={lead.emailStatus} />
                    </span>
                  </div>
                ) : (
                  <span className="lf-muted">Not found</span>
                )}
              </td>
              <td className="text-nowrap">
                {lead.phone ? (
                  <div className="d-flex flex-column">
                    <span>{lead.phone}</span>
                    <span className="mt-1">
                      <PhoneStatusBadge status={lead.phoneStatus} lineType={lead.phoneLineType} />
                    </span>
                  </div>
                ) : (
                  <span className="lf-muted">—</span>
                )}
              </td>
              <td className="lf-truncate">{lead.location || <span className="lf-muted">—</span>}</td>
              <td className="lf-truncate">{lead.keyword}</td>
              <td>
                <ScoreBadge score={lead.leadScore} />
              </td>
              <td>
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: 140 }}
                  value={lead.leadStatus}
                  onChange={(event) => onStatusChange(lead.id, event.target.value)}
                  aria-label="Change lead status"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="small"
                >
                  Open source
                </a>
              </td>
              <td className="lf-muted small text-nowrap">
                {new Date(lead.createdAt).toLocaleDateString()}
              </td>
              <td className="text-end text-nowrap">
                <Link href={`/leads/${lead.id}`} className="btn btn-sm btn-light me-1">
                  View
                </Link>
                {lead.website ? (
                  <a
                    className="btn btn-sm btn-light me-1"
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Site
                  </a>
                ) : null}
                <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(lead)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
