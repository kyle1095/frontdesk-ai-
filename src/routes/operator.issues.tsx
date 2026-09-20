/**
 * Issue log — general site problems: DB write failures, unhandled exceptions
 * in the public chat endpoint, and other non-security errors. Scoped
 * strictly to the signed-in account's own business.
 */

import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { operatorIssueLog } from "~/server/api";
import type { IssueLogRecord } from "~/server/store";

export const Route = createFileRoute("/operator/issues")({
  component: IssueLogPage,
});

function fmt(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function IssueLogPage() {
  const [issues, setIssues] = useState<IssueLogRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    void operatorIssueLog()
      .then((res) => {
        if (!res.ok) {
          if (res.error === "Sign-in required.") {
            window.location.replace("/login");
            return;
          }
          setError(res.error ?? "Could not load the issue log.");
          return;
        }
        setIssues(res.issues);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the issue log."));
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Issue log</h1>
            <p className="text-sm text-slate-500">Database write failures and unhandled errors for your business</p>
          </div>
          <a href="/operator" className="text-sm font-medium text-teal-700 underline underline-offset-4">← Back to operator view</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}
        {!issues && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {issues && issues.length === 0 && (
          <p className="text-sm text-slate-500">No issues recorded yet.</p>
        )}
        {issues && issues.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <Fragment key={issue.id}>
                    <tr
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      onClick={() => setExpanded(expanded === issue.id ? null : issue.id)}
                    >
                      <td className="px-4 py-3 text-slate-600">{fmt(issue.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{issue.source}</td>
                      <td className="px-4 py-3 text-slate-800">{issue.message}</td>
                    </tr>
                    {expanded === issue.id && (
                      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
                        <td colSpan={3} className="px-4 py-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                            {JSON.stringify({ requestPath: issue.requestPath, ip: issue.ip, userAgent: issue.userAgent, detail: issue.detail }, null, 2)}
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
