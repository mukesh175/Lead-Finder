import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dailyUsage } from "@/lib/leads/pipeline";
import StatsCard from "@/components/StatsCard";
import LeadCard from "@/components/LeadCard";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · LeadFinder" };

export default async function DashboardPage() {
  const user = await requireUser();
  const where = { userId: user.id };

  const [totalLeads, hotLeads, emailsFound, verifiedEmails, latestLeads, recentSearches, usage] =
    await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, leadScore: { gte: 80 } } }),
      prisma.lead.count({ where: { ...where, email: { not: null } } }),
      prisma.lead.count({ where: { ...where, emailStatus: "valid" } }),
      prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.search.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { _count: { select: { leads: true } } },
      }),
      dailyUsage(user.id),
    ]);

  return (
    <>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name}` : ""}`}
        subtitle="Your lead discovery at a glance."
        actions={
          <Link href="/find-leads" className="btn btn-primary">
            Find leads
          </Link>
        }
      />

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard label="Total Leads" value={totalLeads.toLocaleString()} icon="☰" tone="primary" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard label="Hot Leads" value={hotLeads.toLocaleString()} icon="🔥" tone="danger" hint="Score 80+" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard label="Emails Found" value={emailsFound.toLocaleString()} icon="📮" tone="info" hint="Publicly listed" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatsCard
            label="Verified Emails"
            value={verifiedEmails.toLocaleString()}
            icon="✅"
            tone="success"
            hint="Confirmed by a verification provider"
          />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="lf-card p-3 p-lg-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-semibold mb-0">Latest leads</h2>
              <Link href="/leads" className="small">
                View all
              </Link>
            </div>
            {latestLeads.length === 0 ? (
              <EmptyState
                title="No leads yet"
                message="Run your first keyword search to start building your lead database."
                action={
                  <Link href="/find-leads" className="btn btn-primary">
                    Find leads
                  </Link>
                }
              />
            ) : (
              <div className="row g-3">
                {latestLeads.map((lead) => (
                  <div className="col-12 col-md-6" key={lead.id}>
                    <LeadCard lead={lead} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="lf-card p-3 p-lg-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-semibold mb-0">Recent searches</h2>
              <Link href="/searches" className="small">
                View all
              </Link>
            </div>

            {recentSearches.length === 0 ? (
              <EmptyState icon="🕘" title="No searches yet" message="Your search history will appear here." />
            ) : (
              <div className="table-responsive">
                <table className="table lf-table">
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Location</th>
                      <th className="text-end">Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSearches.map((search) => (
                      <tr key={search.id}>
                        <td className="lf-truncate">
                          <Link href={`/searches?open=${search.id}`} className="text-reset fw-semibold">
                            {search.keyword}
                          </Link>
                        </td>
                        <td className="lf-muted">{search.location || "Global"}</td>
                        <td className="text-end">{search._count.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="alert alert-light border mt-3 mb-0 small">
              Today&apos;s searches: <strong>{usage.used} / {usage.limit}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
