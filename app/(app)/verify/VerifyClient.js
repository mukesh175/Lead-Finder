"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import PhoneCredits from "@/components/PhoneCredits";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "@/components/Toast";

const TONES = { valid: "success", invalid: "danger", unknown: "warning", not_checked: "secondary" };
const LABELS = {
  valid: "Active line",
  invalid: "Invalid number",
  unknown: "Could not determine",
  not_checked: "Not checked",
};

export default function VerifyClient({ provider, budget: initialBudget }) {
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [budget, setBudget] = useState(initialBudget);
  const [history, setHistory] = useState([]);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = phone.trim();
    if (trimmed.length < 5) {
      toast.error("Enter a phone number.");
      return;
    }

    setBusy(true);
    try {
      const data = await apiRequest("/api/phone/verify", {
        method: "POST",
        body: { phone: trimmed },
      });
      if (data.budget) setBudget(data.budget);
      setHistory((current) => [{ ...data, id: `${Date.now()}` }, ...current].slice(0, 15));
      if (!data.provider.configured) {
        toast.info("No verification provider configured - set PHONE_VERIFICATION_API_KEY.");
      } else if (data.result.reason) {
        toast.error(data.result.reason);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Verify a phone number"
        subtitle="Check any number - from your leads or typed in by hand - against the phone validation provider."
        actions={<PhoneCredits budget={budget} className="align-self-center" />}
      />

      {!provider.configured ? (
        <div className="alert alert-warning">
          No phone verification provider is configured, so numbers can only be format-checked. Set{" "}
          <code>PHONE_VERIFICATION_API_KEY</code> (and optionally{" "}
          <code>PHONE_VERIFICATION_PROVIDER</code>) to enable carrier lookups.
        </div>
      ) : null}

      <form className="lf-card p-4" onSubmit={submit}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-8">
            <label className="form-label fw-semibold" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              className="form-control form-control-lg"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={40}
              disabled={busy}
            />
            <div className="form-text">
              Include the country code for the most accurate result.
            </div>
          </div>
          <div className="col-12 col-md-4">
            <button className="btn btn-primary btn-lg w-100" type="submit" disabled={busy}>
              {busy ? "Checking..." : "Verify number"}
            </button>
          </div>
        </div>
      </form>

      {history.length > 0 ? (
        <div className="lf-card mt-4">
          <div className="p-3 border-bottom fw-semibold">Checked in this session</div>
          <div className="table-responsive">
            <table className="table lf-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Result</th>
                  <th>Line type</th>
                  <th>Carrier</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="fw-semibold text-nowrap">
                      {entry.result.formatted || entry.phone}
                    </td>
                    <td>
                      <span className={`badge text-bg-${TONES[entry.result.status] || "secondary"}`}>
                        {LABELS[entry.result.status] || entry.result.status}
                      </span>
                      {entry.result.reason ? (
                        <div className="lf-muted small mt-1" style={{ maxWidth: 460 }}>
                          {entry.result.reason}
                        </div>
                      ) : null}
                    </td>
                    <td>{entry.result.lineType || <span className="lf-muted">—</span>}</td>
                    <td>{entry.result.carrier || <span className="lf-muted">—</span>}</td>
                    <td>
                      {entry.result.country || entry.result.location || (
                        <span className="lf-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="lf-muted small mt-3">
        A result of &quot;Active line&quot; means the number is correctly formatted and allocated to
        a real carrier. It does not guarantee that the person will answer.
      </p>
    </>
  );
}
