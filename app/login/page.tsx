"use client";

import { useState } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        // Full navigation so the middleware sees the fresh session cookie.
        window.location.href = "/";
        return;
      }
      if (res.status === 400) {
        // The gate is off — this deployment is public, no code needed.
        window.location.href = "/";
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `Sign-in failed (${res.status})`);
      setSubmitting(false);
    } catch {
      setError("Could not reach the terminal — try again");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-edge bg-surface/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6">
        US100 · NASDAQ-100 · Strategy Terminal
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-edge bg-surface p-6"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-caution">
              Restricted access
            </p>
            <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight">
              Unlock the terminal
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              This deployment is protected by its owner. Enter the access code
              to open the dashboard.
            </p>

            <label
              htmlFor="access-code"
              className="mt-5 block text-[11px] font-medium uppercase tracking-[0.16em] text-faint"
            >
              Access code
            </label>
            <input
              id="access-code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-1.5 w-full rounded border border-edge bg-raised/60 px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-faint focus:border-muted"
            />

            {error && (
              <p role="alert" className="mt-2 text-[13px] text-down">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || code.length === 0}
              className="mt-4 w-full rounded bg-ink px-3 py-2 font-mono text-sm font-medium uppercase tracking-wider text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Checking…" : "Unlock terminal"}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            Rules-based market analysis · educational only — not financial
            advice.
          </p>
        </div>
      </main>
    </div>
  );
}
