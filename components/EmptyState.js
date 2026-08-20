export default function EmptyState({ icon = "🔍", title, message, action = null }) {
  return (
    <div className="text-center py-5 px-3">
      <div style={{ fontSize: "2.25rem" }}>{icon}</div>
      <h6 className="mt-3 mb-1 fw-semibold">{title}</h6>
      <p className="lf-muted mb-3">{message}</p>
      {action}
    </div>
  );
}
