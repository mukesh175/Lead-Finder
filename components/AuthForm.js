"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/clientApi";
import { useToast } from "./Toast";

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: isRegister ? form : { email: form.email, password: form.password },
      });
      toast.success(isRegister ? "Account created." : "Welcome back.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div className="w-100" style={{ maxWidth: 420 }}>
        <div className="text-center mb-4">
          <Link href="/" className="fw-bold fs-4 text-reset">
            Lead<span className="text-primary">Finder</span>
          </Link>
        </div>

        <div className="lf-card p-4 p-lg-5">
          <h1 className="h5 fw-bold mb-1">{isRegister ? "Create your account" : "Sign in"}</h1>
          <p className="lf-muted small mb-4">
            {isRegister
              ? "Start turning keywords into a lead database."
              : "Welcome back. Enter your details to continue."}
          </p>

          <form onSubmit={submit} noValidate>
            {isRegister ? (
              <div className="mb-3">
                <label className="form-label" htmlFor="name">
                  Name <span className="lf-muted">(optional)</span>
                </label>
                <input
                  id="name"
                  className="form-control"
                  value={form.name}
                  onChange={update("name")}
                  autoComplete="name"
                  maxLength={80}
                />
              </div>
            ) : null}

            <div className="mb-3">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={form.password}
                onChange={update("password")}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                required
              />
              {isRegister ? (
                <div className="form-text">At least 8 characters.</div>
              ) : null}
            </div>

            {error ? <div className="alert alert-danger py-2">{error}</div> : null}

            <button className="btn btn-primary w-100" type="submit" disabled={busy}>
              {busy ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-center lf-muted small mt-4 mb-0">
            {isRegister ? (
              <>
                Already have an account? <Link href="/login">Sign in</Link>
              </>
            ) : (
              <>
                New to LeadFinder? <Link href="/register">Create an account</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
