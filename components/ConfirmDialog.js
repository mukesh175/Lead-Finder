"use client";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <>
      <div className="modal d-block" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content lf-card border-0">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>
            <div className="modal-body lf-muted">{message}</div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-${variant}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? "Working..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
