/**
 * Security event log — failed/blocked logins, signup abuse, invalid widget
 * probing, suspected chat floods, and the operator audit trail (who changed
 * which ticket/KB entry). Scoped strictly to the signed-in account's own
 * business — platform-wide events (business_id IS NULL) are reviewed
 * directly via the Neon SQL console, not shown here (see the security
 * logging plan for why).
 */

import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { operatorSecurityEvents } from "~/server/api";
import type { SecurityEventRecord } from "~/server/store";

export const Route = createFileRoute("/operator/security")({
  component: SecurityLogPage,
});

function fmt(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
};

function SecurityLogPage() {
  const [events, setEvents] = useState<SecurityEventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    void operatorSecurityEvents()
      .then((res) => {
        if (!res.ok) {
          if (res.error === "Sign-in required.") {
            window.location.replace("/login");
            return;
          }
          setError(res.error ?? "Could not load security events.");
          return;
        }
        setEvents(res.events);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load security events."));
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Security event log</h1>
            <p className="text-sm text-slate-500">Failed logins, blocked signups, and operator audit trail for your business</p>
          </div>
          <a href="/operator" className="text-sm font-medium text-teal-700 underline underline-offset-4">← Back to operator view</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}
        {!events && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {events && events.length === 0 && (
          <p className="text-sm text-slate-500">No security events recorded yet.</p>
        )}
        {events && events.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <Fragment key={event.id}>
                    <tr
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                    >
                      <td className="px-4 py-3 text-slate-600">{fmt(event.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{event.eventType}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[event.severity] ?? "bg-slate-100 text-slate-700"}`}>
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{event.actorEmail ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{event.ip ?? "—"}</td>
                    </tr>
                    {expanded === event.id && (
                      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
                        <td colSpan={5} className="px-4 py-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                            {JSON.stringify({ userAgent: event.userAgent, accountId: event.accountId, requestPath: event.requestPath, detail: event.detail }, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
