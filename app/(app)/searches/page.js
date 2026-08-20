import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dailyUsage } from "@/lib/leads/pipeline";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search History · LeadFinder" };

const STATUS_TONES = { COMPLETED: "success", PROCESSING: "info", PENDING: "secondary", FAILED: "danger" };

export default async function SearchesPage({ searchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params?.page || "1", 10) || 1);
  const pageSize = 25;

  const [total, searches, usage] = await Promise.all([
    prisma.search.count({ where: { userId: user.id } }),
    prisma.search.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { leads: true } } },
    }),
    dailyUsage(user.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Search history"
        subtitle="Every search is stored. Open one to see exactly the leads it produced."
        actions={
          <span className="badge text-bg-light border align-self-center">
            Today&apos;s searches: {usage.used} / {usage.limit}
          </span>
        }
      />

      <div className="lf-card">
        {searches.length === 0 ? (
          <EmptyState
            icon="🕘"
            title="No searches yet"
            message="Run a keyword search and it will show up here."
            action={
              <Link href="/find-leads" className="btn btn-primary">
                Find leads
              </Link>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table lf-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Location</th>
                  <th>Requested</th>
                  <th>Found</th>
                  <th>Leads</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {searches.map((search) => (
                  <tr key={search.id}>
                    <td className="fw-semibold lf-truncate">{search.keyword}</td>
                    <td className="lf-muted">{search.location || "Global"}</td>
                    <td>{search.resultLimit}</td>
                    <td>{search.resultsFound}</td>
                    <td>{search._count.leads}</td>
                    <td>
                      <span className={`badge text-bg-${STATUS_TONES[search.status] || "secondary"}`}>
                        {search.status}
                      </span>
                    </td>
                    <td className="lf-muted small text-nowrap">
                      {new Date(search.createdAt).toLocaleString()}
                    </td>
                    <td className="text-end text-nowrap">
                      <Link className="btn btn-sm btn-light me-1" href={`/leads?searchId=${search.id}`}>
                        Open results
                      </Link>
                      <a className="btn btn-sm btn-light" href={`/api/leads/export?searchId=${search.id}`}>
                        Export
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <span className="lf-muted small">
              Page {page} of {totalPages}
            </span>
            <div className="d-flex gap-2">
              <Link
                className={`btn btn-sm btn-light ${page <= 1 ? "disabled" : ""}`}
                href={`/searches?page=${page - 1}`}
              >
                Previous
              </Link>
              <Link
                className={`btn btn-sm btn-light ${page >= totalPages ? "disabled" : ""}`}
                href={`/searches?page=${page + 1}`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
