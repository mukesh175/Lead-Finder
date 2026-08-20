import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  ["Any Keyword", "🔤", "Search for any niche, service or industry. Nothing is hardcoded - your keyword drives everything."],
  ["Public Contact Discovery", "📮", "Emails, phones and social profiles are collected only from publicly accessible pages, with the source URL stored."],
  ["Lead Scoring", "📈", "Every lead is scored 0-100 from the signals actually found, then bucketed into Hot, Warm, Potential and Low."],
  ["Email Verification", "✅", "Plug in a verification provider when you need it. Without one, addresses are honestly marked \"Not checked\"."],
  ["CSV Export", "⬇️", "Export everything, your current search, the hot leads only, or just the rows you selected."],
  ["Search History", "🕘", "Every search is stored with its keyword, location and results so you can reopen it any time."],
];

const STEPS = [
  ["Enter a keyword", "Add an optional location and choose how many leads you want."],
  ["We search the public web", "Results come from an approved search API - never scraped result pages."],
  ["Pages are analysed", "A small, polite same-domain crawl reads the contact and about pages."],
  ["Leads are scored and saved", "Duplicates are merged, leads are scored and stored in PostgreSQL."],
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/register";

  return (
    <div>
      <nav className="navbar navbar-expand-lg bg-white border-bottom py-3">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            Lead<span className="text-primary">Finder</span>
          </Link>
          <div className="ms-auto d-flex gap-2">
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-light" href="/login">
                  Sign in
                </Link>
                <Link className="btn btn-primary" href="/register">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="lf-hero py-5">
        <div className="container py-lg-5 text-center" style={{ maxWidth: 820 }}>
          <span className="badge text-bg-light border mb-3">Free-tier friendly · Bring your own API keys</span>
          <h1 className="display-4 mb-3">Find Your Next Customers From Any Keyword</h1>
          <p className="fs-5 lf-muted mb-4">
            Discover relevant businesses and publicly available contact information from across the
            web. Score them, manage them and export them - all from a single keyword.
          </p>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            <Link className="btn btn-primary btn-lg px-4" href={primaryHref}>
              Start Finding Leads
            </Link>
            <Link className="btn btn-outline-primary btn-lg px-4" href="/login">
              Sign in
            </Link>
          </div>

          <div className="lf-card p-3 mt-5 text-start">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-5">
                <label className="form-label small lf-muted mb-1">Keyword</label>
                <div className="form-control bg-light">Shopify developer</div>
              </div>
              <div className="col-8 col-md-4">
                <label className="form-label small lf-muted mb-1">Location (optional)</label>
                <div className="form-control bg-light">USA</div>
              </div>
              <div className="col-4 col-md-3">
                <span className="btn btn-primary w-100 disabled">Find Leads</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="py-5 bg-white border-top">
        <div className="container">
          <h2 className="h3 fw-bold text-center mb-1">Everything you need to build a lead list</h2>
          <p className="lf-muted text-center mb-5">One workflow, from keyword to CSV.</p>
          <div className="row g-3 g-lg-4">
            {FEATURES.map(([title, icon, copy]) => (
              <div className="col-12 col-md-6 col-lg-4" key={title}>
                <div className="lf-card h-100 p-4">
                  <div className="lf-stat-icon bg-primary-subtle text-primary mb-3">{icon}</div>
                  <h3 className="h6 fw-semibold">{title}</h3>
                  <p className="lf-muted mb-0 small">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <h2 className="h3 fw-bold text-center mb-5">How it works</h2>
          <div className="row g-3">
            {STEPS.map(([title, copy], index) => (
              <div className="col-12 col-md-6 col-lg-3" key={title}>
                <div className="lf-card h-100 p-4">
                  <span className="badge text-bg-primary mb-2">Step {index + 1}</span>
                  <h3 className="h6 fw-semibold">{title}</h3>
                  <p className="lf-muted mb-0 small">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5 bg-white border-top">
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="lf-card p-4 p-lg-5">
            <h2 className="h5 fw-bold mb-3">What LeadFinder does and does not do</h2>
            <p className="mb-3">
              LeadFinder discovers publicly available business and professional contact information.
              It does not provide private information about individual search engine users.
            </p>
            <ul className="lf-muted mb-0">
              <li>Search engines do not expose who searched for a keyword, and LeadFinder never claims otherwise.</li>
              <li>Every contact detail is stored with the exact public source URL it came from and how it was obtained.</li>
              <li>Missing emails stay empty - addresses are never guessed or generated.</li>
              <li>Website analysis is limited to a small number of public pages on the same domain.</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="py-4 border-top bg-white">
        <div className="container d-flex flex-wrap justify-content-between gap-2 lf-muted small">
          <span>© {new Date().getFullYear()} LeadFinder</span>
          <span>Public business data discovery · Built for the free tier</span>
        </div>
      </footer>
    </div>
  );
}
