/**
 * Operator view — the business's side of the help desk.
 *
 * Lists captured leads (with the demo slot they chose), filed tickets (with
 * reference number, triage answers and status) and every conversation, with a
 * transcript viewer. Access is granted only through the signed-in account
 * session, and every query is scoped to that account's business.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  operatorData,
  operatorUpdateTicketStatus,
  operatorCreateKnowledgeBase,
  operatorUpdateKnowledgeBase,
  operatorDeleteKnowledgeBase,
  siteOrigin,
  authLogout,
  type OperatorPayload,
} from "~/server/api";
import type { TicketStatus, KnowledgeBaseEntry, KnowledgeBaseInput } from "~/server/store";

export const Route = createFileRoute("/operator")({
  component: OperatorPage,
});

// Operator access is provided by the HttpOnly account session.
function fmt(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceLabel(source: string | null): string {
  return source ?? "Unattributed";
}

function OperatorPage() {
  const [data, setData] = useState<OperatorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<"all" | TicketStatus>("all");
  const [ticketSort, setTicketSort] = useState<"newest" | "oldest" | "urgency">(
    "newest",
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingTicketId, setUpdatingTicketId] = useState<number | null>(null);
  const [kbBusy, setKbBusy] = useState(false);
  const [kbNotice, setKbNotice] = useState<string | null>(null);
  const [installOrigin, setInstallOrigin] = useState("");
  const [draft, setDraft] = useState<KnowledgeBaseInput>({
    kind: "faq", category: "product", title: "", question: "", answer: "", keywords: [], steps: [],
  });

  const load = useCallback(
    async (conversationId?: string, searchOverride?: string) => {
      setLoading(true);
      try {
        const res = await operatorData({
          data: { conversationId, search: searchOverride ?? searchQuery },
        });
        setData(res);
        if (!res.ok && res.error === "Sign-in required.") {
          window.location.replace("/login");
        }
      } catch (err) {
        setData({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not load operator data.",
          storage: { configured: false, reachable: false, driver: "none" },
          leads: [],
          tickets: [],
          conversations: [],
          conversationSourceCounts: [],
          searchResults: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    void load();
    void siteOrigin().then(setInstallOrigin).catch(() => {});
  }, [load]);

  const signOut = async () => {
    await authLogout();
    window.location.replace("/login");
  };

  const openTranscript = (id: string) => {
    setTranscriptId(id);
    void load(id, searchQuery);
  };

  const visibleTickets = useMemo(() => {
    const tickets = (data?.tickets ?? []).filter(
      (ticket) => ticketFilter === "all" || ticket.status === ticketFilter,
    );
    return [...tickets].sort((a, b) => {
      if (ticketSort === "oldest") return a.id - b.id;
      if (ticketSort === "urgency") {
        const rank = { Urgent: 0, High: 1, Medium: 2, Low: 3 } as Record<
          string,
          number
        >;
        return (rank[a.urgency] ?? 4) - (rank[b.urgency] ?? 4) || b.id - a.id;
      }
      return b.id - a.id;
    });
  }, [data?.tickets, ticketFilter, ticketSort]);

  const searchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setSearchQuery(nextSearch);
    setTranscriptId(null);
    void load(undefined, nextSearch);
  };

  const changeTicketStatus = async (ticketId: number, status: TicketStatus) => {
    setUpdatingTicketId(ticketId);
    const result = await operatorUpdateTicketStatus({
      data: { ticketId, status },
    });
    if (!result.ok) {
      window.alert(result.error ?? "Could not update ticket status.");
    } else {
      await load(transcriptId ?? undefined, searchQuery);
    }
    setUpdatingTicketId(null);
  };

  const saveNewEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    setKbBusy(true);
    setKbNotice(null);
    const result = await operatorCreateKnowledgeBase({ data: draft });
    if (result.ok) {
      setDraft({ kind: "faq", category: "product", title: "", question: "", answer: "", keywords: [], steps: [] });
      setKbNotice("Question added. Your widget will use it immediately.");
      await load(undefined, searchQuery);
    } else setKbNotice(result.error ?? "Could not add that question.");
    setKbBusy(false);
  };

  const saveEntry = async (entry: KnowledgeBaseEntry) => {
    setKbBusy(true);
    setKbNotice(null);
    const result = await operatorUpdateKnowledgeBase({ data: entry });
    if (result.ok) {
      setKbNotice("Saved.");
      await load(transcriptId ?? undefined, searchQuery);
    } else setKbNotice(result.error ?? "Could not save that entry.");
    setKbBusy(false);
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm("Delete this help entry? The widget will stop answering from it.")) return;
    setKbBusy(true);
    setKbNotice(null);
    const result = await operatorDeleteKnowledgeBase({ data: { id } });
    if (result.ok) {
      setKbNotice("Entry deleted.");
      await load(transcriptId ?? undefined, searchQuery);
    } else setKbNotice(result.error ?? "Could not delete that entry.");
    setKbBusy(false);
  };

  const account = data?.account;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Help desk operator view</h1>
            <p className="text-sm text-slate-500">
              Frontdesk AI · sample business “Cadence”
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm font-medium text-teal-700 underline underline-offset-4"
            >
              ← Back to demo site
            </a>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-600">{account?.businessName ?? "Signed in"}</span>
              <button type="button" onClick={() => void signOut()} className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800">Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Authentication failures redirect to /login before tenant data renders. */}
        {data && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                data.storage.reachable
                  ? "bg-emerald-100 text-emerald-900"
                  : data.storage.configured
                    ? "bg-amber-100 text-amber-900"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              Database:{" "}
              {data.storage.reachable
                ? `connected (${data.storage.driver})`
                : data.storage.configured
                  ? "configured but unreachable"
                  : "not configured (DATABASE_URL unset)"}
            </span>
            <span className="text-slate-500">
              {data.leads.length} lead(s) · {data.tickets.length} ticket(s) ·{" "}
              {data.conversations.length} conversation(s)
            </span>
            {data.conversationSourceCounts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Conversations by source">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">By source</span>
                {data.conversationSourceCounts.map((item) => (
                  <span key={item.source ?? "unattributed"} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {sourceLabel(item.source)} · {item.count}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                void load(transcriptId ?? undefined, searchQuery)
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-white"
            >
              {loading ? "Refreshing…" : "Reload"}
            </button>
          </div>
        )}

        <section aria-labelledby="kb-heading" className="rounded-2xl border border-teal-200 bg-white shadow-sm">
          <div className="border-b border-teal-100 bg-teal-50 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Your help content</p>
                <h2 id="kb-heading" className="mt-1 text-xl font-bold text-slate-900">Knowledge base <span className="text-sm font-normal text-slate-500">({data?.knowledgeBase.length ?? 0} entries)</span></h2>
                <p className="mt-1 text-sm text-slate-700">The widget answers only from these questions and answers. Add a few before installing it.</p>
              </div>
              {account?.businessSlug && <a href="/install" className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">Install widget</a>}
            </div>
          </div>
          {data?.knowledgeBase.length === 0 && (
            <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <h3 className="font-semibold">Add your first questions</h3>
              <p className="mt-1">Your new help desk is ready, but it has no answers yet. Add a question below, then install the widget using this snippet:</p>
              {account?.businessSlug && installOrigin && <code className="mt-3 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs">{`<script src="${installOrigin}/widget.js" data-business="${account.businessSlug}"></script>`}</code>}
            </div>
          )}
          <form onSubmit={saveNewEntry} className="grid gap-3 border-b border-slate-100 px-5 py-5">
            <h3 className="font-semibold">Add a question</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title<input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Shipping policy" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question<input required value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="How long does shipping take?" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Answer<textarea required rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} placeholder="Grounded answer customers can rely on" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keywords <span className="font-normal normal-case">(comma separated)</span><input value={draft.keywords.join(", ")} onChange={(e) => setDraft({ ...draft, keywords: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="shipping, delivery, arrival" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type<select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as KnowledgeBaseInput["kind"] })} className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="faq">FAQ</option><option value="troubleshooting">Troubleshooting</option></select></label>
              <button disabled={kbBusy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{kbBusy ? "Saving…" : "Add question"}</button>
            </div>
            {kbNotice && <p role="status" className="text-sm text-teal-700">{kbNotice}</p>}
          </form>
          <div className="divide-y divide-slate-100">
            {(data?.knowledgeBase ?? []).map((entry) => (
              <article key={entry.id} className="space-y-3 px-5 py-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title<input value={entry.title} onChange={(e) => setData((current) => current ? { ...current, knowledgeBase: current.knowledgeBase.map((x) => x.id === entry.id ? { ...x, title: e.target.value } : x) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question<input value={entry.question} onChange={(e) => setData((current) => current ? { ...current, knowledgeBase: current.knowledgeBase.map((x) => x.id === entry.id ? { ...x, question: e.target.value } : x) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                </div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Answer<textarea rows={3} value={entry.answer} onChange={(e) => setData((current) => current ? { ...current, knowledgeBase: current.knowledgeBase.map((x) => x.id === entry.id ? { ...x, answer: e.target.value } : x) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[240px] flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Keywords<input value={entry.keywords.join(", ")} onChange={(e) => setData((current) => current ? { ...current, knowledgeBase: current.knowledgeBase.map((x) => x.id === entry.id ? { ...x, keywords: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } : x) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">{entry.kind}</span>
                  <button type="button" disabled={kbBusy} onClick={() => void saveEntry(entry)} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">Save</button>
                  <button type="button" disabled={kbBusy} onClick={() => void deleteEntry(entry.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {data?.plan && (
          <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5" aria-labelledby="plan-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Current plan</p>
                <h2 id="plan-heading" className="mt-1 text-xl font-bold text-slate-900">{data.plan.plan.name}</h2>
                <p className="mt-1 text-sm text-slate-700">{data.plan.plan.description}</p>
              </div>
              <a href="/pricing" className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">View plans</a>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
              <span><strong>{data.plan.used.toLocaleString()}</strong> of {data.plan.limit.toLocaleString()} conversations this month</span>
              <span>{data.plan.plan.seats} seat{data.plan.plan.seats === 1 ? "" : "s"}</span>
              <span>{data.plan.brandingRequired ? "Frontdesk AI branding on" : "Branding removed"}</span>
            </div>
          </section>
        )}

        {data && !data.storage.reachable && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Nothing can be stored while the database is not reachable, so there
            are no rows to show yet. The chat widget still answers questions,
            and it tells customers plainly that tickets and demo requests could
            not be saved instead of inventing a reference number.
            {data.storage.error && (
              <span className="mt-1 block font-mono text-xs break-all text-amber-800">
                {data.storage.error}
              </span>
            )}
          </p>
        )}

        <section
          aria-labelledby="leads-heading"
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <h2
              id="leads-heading"
              className="text-sm font-semibold uppercase tracking-wide text-slate-500"
            >
              Lead pipeline
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Captured contact details and the booked 30-minute call slot.
            </p>
          </div>
          {data?.leads.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Clinic / company</th>
                    <th className="px-4 py-2">What they need</th>
                    <th className="px-4 py-2">Chosen slot</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Captured</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {lead.id}
                      </td>
                      <td className="px-4 py-3 font-medium">{lead.name}</td>
                      <td className="px-4 py-3 text-slate-700">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {lead.company}
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-slate-700">
                        {lead.need}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {lead.slotLabel ? (
                          <>
                            <span className="font-medium text-emerald-800">
                              Booked
                            </span>
                            <span className="mt-1 block">{lead.slotLabel}</span>
                            {lead.slotStartsAt && (
                              <span className="mt-1 block text-xs text-slate-500">
                                {fmt(lead.slotStartsAt)}
                              </span>
                            )}
                          </>
                        ) : (
                          "No slot booked"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {fmt(lead.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">
              No leads captured yet.
            </p>
          )}
        </section>

        <section
          aria-labelledby="tickets-heading"
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2
                id="tickets-heading"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                Ticket queue
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Change status here; updates are saved to Postgres.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <label className="sr-only" htmlFor="ticket-status-filter">
                Filter tickets by status
              </label>
              <select
                id="ticket-status-filter"
                value={ticketFilter}
                onChange={(event) =>
                  setTicketFilter(event.target.value as "all" | TicketStatus)
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <label className="sr-only" htmlFor="ticket-sort">
                Sort tickets
              </label>
              <select
                id="ticket-sort"
                value={ticketSort}
                onChange={(event) =>
                  setTicketSort(event.target.value as typeof ticketSort)
                }
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="urgency">Highest urgency</option>
              </select>
            </div>
          </div>
          {visibleTickets.length ? (
            <ul className="divide-y divide-slate-100">
              {visibleTickets.map((ticket) => (
                <li key={ticket.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-teal-800">
                      {ticket.reference}
                    </span>
                    <span className="font-medium">{ticket.subject}</span>
                    <label
                      className="sr-only"
                      htmlFor={`ticket-status-${ticket.id}`}
                    >
                      Status for {ticket.reference}
                    </label>
                    <select
                      id={`ticket-status-${ticket.id}`}
                      value={ticket.status}
                      disabled={updatingTicketId === ticket.id}
                      onChange={(event) =>
                        void changeTicketStatus(
                          ticket.id,
                          event.target.value as TicketStatus,
                        )
                      }
                      className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        ticket.urgency === "Urgent" || ticket.urgency === "High"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ticket.urgency}
                    </span>
                    <span className="text-xs text-slate-500">
                      {fmt(ticket.createdAt)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        What they were doing
                      </dt>
                      <dd className="text-slate-700">{ticket.whatDoing}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        What happened
                      </dt>
                      <dd className="text-slate-700">{ticket.whatHappened}</dd>
                    </div>
                  </dl>
                  {ticket.conversationId && (
                    <button
                      type="button"
                      onClick={() =>
                        openTranscript(ticket.conversationId as string)
                      }
                      className="mt-3 text-xs font-medium text-teal-700 underline underline-offset-4"
                    >
                      Open conversation transcript
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">
              {data?.tickets.length
                ? "No tickets match this status filter."
                : "No tickets filed yet."}
            </p>
          )}
        </section>

        <section
          aria-labelledby="search-heading"
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <h2
              id="search-heading"
              className="text-sm font-semibold uppercase tracking-wide text-slate-500"
            >
              Transcript search
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Search message text, then open the full conversation transcript.
            </p>
          </div>
          <form
            onSubmit={searchSubmit}
            className="flex flex-wrap gap-2 px-4 py-4"
          >
            <label className="sr-only" htmlFor="transcript-search">
              Search transcripts
            </label>
            <input
              id="transcript-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search messages…"
              className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Search
            </button>
            {searchQuery && (
              <span className="self-center text-xs text-slate-500">
                Showing matches for “{searchQuery}”
              </span>
            )}
          </form>
          {searchQuery && (data?.searchResults.length ?? 0) === 0 ? (
            <p className="px-4 pb-5 text-sm text-slate-500">
              No conversations matched that search.
            </p>
          ) : data?.searchResults.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.searchResults.map((conversation) => (
                <li
                  key={conversation.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-500">
                      {conversation.id}
                    </p>
                    <p className="mt-1 truncate text-slate-700">
                      {conversation.matchedBody}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTranscript(conversation.id)}
                    className="text-xs font-medium text-teal-700 underline underline-offset-4"
                  >
                    Open full transcript
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section
          aria-labelledby="conversations-heading"
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <h2
            id="conversations-heading"
            className="border-b border-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Conversations
          </h2>
          {data?.conversations.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.conversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <span className="font-mono text-xs text-slate-500">
                    {conversation.id}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {sourceLabel(conversation.source)}
                    </span>
                    {conversation.entryPoint && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">
                        Chip: {conversation.entryPoint}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-600">
                    {conversation.messageCount} message(s)
                  </span>
                  <span className="text-xs text-slate-500">
                    updated {fmt(conversation.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openTranscript(conversation.id)}
                    className="text-xs font-medium text-teal-700 underline underline-offset-4"
                  >
                    View transcript
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">
              No conversations recorded yet.
            </p>
          )}
        </section>

        {transcriptId && (
          <section
            aria-labelledby="transcript-heading"
            className="rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2
                id="transcript-heading"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                Transcript
              </h2>
              <button
                type="button"
                onClick={() => setTranscriptId(null)}
                className="text-xs font-medium text-slate-600 underline underline-offset-4"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              {data?.transcript?.messages.length ? (
                data.transcript.messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className="text-sm"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {message.role} · {fmt(message.createdAt)}
                    </p>
                    <p className="whitespace-pre-line text-slate-800">
                      {message.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No messages found for this conversation.
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
