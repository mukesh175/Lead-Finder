import Link from "next/link";

export default function NotFound() {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div className="lf-card p-5 text-center" style={{ maxWidth: 460 }}>
        <div style={{ fontSize: "2.5rem" }}>🔎</div>
        <h1 className="h5 fw-bold mt-3">Page not found</h1>
        <p className="lf-muted">The page you are looking for does not exist or has been removed.</p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
