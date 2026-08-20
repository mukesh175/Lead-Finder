const TONES = {
  NEW: "primary",
  CONTACTED: "info",
  REPLIED: "warning",
  QUALIFIED: "success",
  CONVERTED: "success",
  NOT_INTERESTED: "secondary",
  ARCHIVED: "dark",
};

const EMAIL_TONES = { valid: "success", invalid: "danger", unknown: "warning", not_checked: "secondary" };
const EMAIL_LABELS = { valid: "Valid", invalid: "Invalid", unknown: "Unknown", not_checked: "Not checked" };

export function StatusBadge({ status }) {
  return (
    <span className={`badge text-bg-${TONES[status] || "secondary"}`}>
      {String(status || "").replace(/_/g, " ")}
    </span>
  );
}

export function EmailStatusBadge({ status }) {
  return (
    <span className={`badge text-bg-${EMAIL_TONES[status] || "secondary"}`}>
      {EMAIL_LABELS[status] || "Not checked"}
    </span>
  );
}

export const LEAD_STATUSES = Object.keys(TONES);
