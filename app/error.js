"use client";

export default function GlobalError({ error, reset }) {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div className="lf-card p-5 text-center" style={{ maxWidth: 480 }}>
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h1 className="h5 fw-bold mt-3">Something went wrong</h1>
        <p className="lf-muted">{error?.message || "An unexpected error occurred."}</p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
