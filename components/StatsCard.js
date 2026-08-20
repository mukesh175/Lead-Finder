export default function StatsCard({ label, value, icon, tone = "primary", hint = null }) {
  return (
    <div className="lf-card h-100 p-3 p-xl-4">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div className="lf-muted small text-uppercase fw-semibold" style={{ letterSpacing: ".06em" }}>
            {label}
          </div>
          <div className="lf-stat-value mt-1">{value}</div>
          {hint ? <div className="lf-muted small mt-1">{hint}</div> : null}
        </div>
        <span className={`lf-stat-icon bg-${tone}-subtle text-${tone}`}>{icon}</span>
      </div>
    </div>
  );
}
