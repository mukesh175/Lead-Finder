export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
      <div>
        <h1 className="h4 fw-bold mb-1">{title}</h1>
        {subtitle ? <p className="lf-muted mb-0">{subtitle}</p> : null}
      </div>
      {actions ? <div className="d-flex gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}
