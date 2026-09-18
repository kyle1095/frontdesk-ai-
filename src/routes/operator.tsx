/**
 * Operator view — the business's side of the help desk.
 *
 * Lists captured leads (with the demo slot they chose), filed tickets (with
 * reference number, triage answers and status) and every conversation, with a
 * transcript viewer. Gated by OPERATOR_PASSWORD; when that variable is unset the
 * page shows a loud warning and stays open, so a missing secret can never lock
 * the owner out of their own data.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  operatorData,
  operatorUpdateTicketStatus,
  type OperatorPayload,
} from "~/server/api";
import type { TicketStatus } from "~/server/store";

export const Route = createFileRoute("/operator")({
  component: OperatorPage,
});

const STORAGE_KEY = "frontdesk.operator.password";

function fmt(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function OperatorPage() {
  const [password, setPassword] = useState("");
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

  const load = useCallback(
    async (pw: string, conversationId?: string, searchOverride?: string) => {
      setLoading(true);
      try {
        const res = await operatorData({
          data: {
            password: pw,
            conversationId,
            search: searchOverride ?? searchQuery,
          },
        });
        setData(res);
      } catch (err) {
        setData({
          ok: false,
          passwordConfigured: true,
          error:
            err instanceof Error
              ? err.message
              : "Could not load operator data.",
          storage: { configured: false, reachable: false, driver: "none" },
          leads: [],
          tickets: [],
          conversations: [],
          searchResults: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    const saved = window.sessionStorage.getItem(STORAGE_KEY) ?? "";
    setPassword(saved);
    void load(saved);
  }, [load]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    window.sessionStorage.setItem(STORAGE_KEY, password);
    setTranscriptId(null);
    void load(password, undefined, searchInput.trim());
  };

  const openTranscript = (id: string) => {
    setTranscriptId(id);
    void load(password, id, searchQuery);
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
    void load(password, undefined, nextSearch);
  };

  const changeTicketStatus = async (ticketId: number, status: TicketStatus) => {
    setUpdatingTicketId(ticketId);
    const result = await operatorUpdateTicketStatus({
      data: { password, ticketId, status },
    });
    if (!result.ok) {
      window.alert(result.error ?? "Could not update ticket status.");
    } else {
      await load(password, transcriptId ?? undefined, searchQuery);
    }
    setUpdatingTicketId(null);
  };

  const wrongPassword =
    data && !data.ok && data.error === "Incorrect password.";

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
            <form onSubmit={submit} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="operator-password">
                Operator password
              </label>
              <input
                id="operator-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Operator password"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Load
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {data && !data.passwordConfigured && (
          <p
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <strong>OPERATOR_PASSWORD is not set.</strong> This page is unlocked
            — anyone with the link can read every lead, ticket and transcript.
            Set <code className="font-mono">OPERATOR_PASSWORD</code> in the
            environment to gate it.
          </p>
        )}

        {wrongPassword && (
          <p
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            Wrong password. Try again, or clear the field and press Load if the
            operator password was only just removed.
          </p>
        )}

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
            <button
              type="button"
              onClick={() =>
                void load(password, transcriptId ?? undefined, searchQuery)
              }
              className="rounded-lg border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-white"
            >
              {loading ? "Refreshing…" : "Reload"}
            </button>
          </div>
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
