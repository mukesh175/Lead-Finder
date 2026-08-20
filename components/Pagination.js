"use client";

const PAGE_SIZES = [25, 50, 100];

export default function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  const pages = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  for (let i = from; i <= to; i += 1) pages.push(i);

  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(total, page * pageSize);

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 border-top">
      <div className="lf-muted small">
        Showing {firstRow}-{lastRow} of {total.toLocaleString()} leads
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <label className="lf-muted small mb-0" htmlFor="page-size">
            Per page
          </label>
          <select
            id="page-size"
            className="form-select form-select-sm"
            style={{ width: 80 }}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => onPageChange(page - 1)}>
              Previous
            </button>
          </li>
          {pages.map((value) => (
            <li key={value} className={`page-item ${value === page ? "active" : ""}`}>
              <button className="page-link" onClick={() => onPageChange(value)}>
                {value}
              </button>
            </li>
          ))}
          <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => onPageChange(page + 1)}>
              Next
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
