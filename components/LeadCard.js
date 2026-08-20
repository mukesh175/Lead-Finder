import Link from "next/link";
import ScoreBadge from "./ScoreBadge";
import { StatusBadge } from "./StatusBadge";

/** Compact lead summary used on the dashboard's "latest leads" list. */
export default function LeadCard({ lead }) {
  return (
    <Link href={`/leads/${lead.id}`} className="text-reset d-block">
      <div className="lf-card p-3 h-100">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-semibold lf-truncate">{lead.companyName || "Unknown company"}</div>
            <div className="lf-muted small lf-truncate">{lead.email || "No public email found"}</div>
          </div>
          <span className="text-nowrap flex-shrink-0">
            <ScoreBadge score={lead.leadScore} />
          </span>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3 small">
          <span className="lf-muted lf-truncate">{lead.keyword}</span>
          <StatusBadge status={lead.leadStatus} />
        </div>
      </div>
    </Link>
  );
}
