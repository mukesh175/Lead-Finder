const COLUMNS = [
  ["Name", (l) => l.name],
  ["Company", (l) => l.companyName],
  ["Email", (l) => l.email],
  ["Email Status", (l) => l.emailStatus],
  ["Phone", (l) => l.phone],
  ["Website", (l) => l.website],
  ["Location", (l) => l.location],
  ["Keyword", (l) => l.keyword],
  ["Lead Score", (l) => l.leadScore],
  ["Lead Status", (l) => l.leadStatus],
  ["Source URL", (l) => l.sourceUrl],
  ["Created At", (l) => l.createdAt?.toISOString?.() || l.createdAt],
];

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Neutralise spreadsheet formula injection while keeping the value readable.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads) {
  const rows = [COLUMNS.map(([header]) => escapeCell(header)).join(",")];
  for (const lead of leads) {
    rows.push(COLUMNS.map(([, getter]) => escapeCell(getter(lead))).join(","));
  }
  return `${rows.join("\r\n")}\r\n`;
}
