/**
 * Frontdesk AI — embeddable help desk widget.
 *
 * Self-contained: it takes a config object (business id, name, copy, accent) and
 * talks to the server through the `chatTurn` server function. Nothing here knows
 * about Cadence specifically, so the same component is what a future install
 * snippet would mount on a customer's site.
 *
 * Behaviour worth knowing:
 *  - replies arrive with a short "typing" pause so the conversation reads like a
 *    chat rather than an instant dump of text;
 *  - the conversation state round-trips to the server (the server also persists
 *    it when a database is configured), so the widget keeps working even if the
 *    database is not connected yet — but it will say so plainly rather than
 *    pretending a ticket was filed;
 *  - keyboard: Escape closes, Enter sends, chips are real buttons, and the
 *    transcript is a live region.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { chatTurn } from "~/server/api";
import type { KbEntry } from "~/content/business";
import { retrieveFromKnowledgeBase } from "~/server/retrieval";
import type {
  AgentReply,
  Chip,
  ConversationState,
  WidgetAction,
} from "~/server/engine";

export interface HelpDeskWidgetConfig {
  businessId: string;
  businessName: string;
  /** Shown in the panel header, e.g. "Cadence support". */
  title: string;
  subtitle?: string;
  greeting: string;
  accent?: string;
  quickActions: Chip[];
  suggestions: string[];
  /** Optional browser-only KB for the self-serve preview. When absent, the server engine is used. */
  knowledgeBase?: KbEntry[];
  localPreview?: boolean;
  /** Where the launcher sits. Defaults to the bottom-right. */
  position?: "right" | "left";
}

interface Bubble {
  id: number;
  role: "user" | "agent";
  text: string;
  chips?: Chip[];
  variant?: AgentReply["variant"];
}

interface StorageInfo {
  configured: boolean;
  ok: boolean;
  error?: string;
}

let bubbleId = 0;
const nextId = () => (bubbleId += 1);

export function HelpDeskWidget({ config }: { config: HelpDeskWidgetConfig }) {
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<ConversationState | null>(null);
  const conversationRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();

  const accent = config.accent ?? "#0f766e";
  const side =
    config.position === "left" ? "left-4 sm:left-6" : "right-4 sm:right-6";

  const pushAgent = useCallback((reply: AgentReply, delay = true) => {
    return new Promise<void>((resolve) => {
      setTyping(true);
      const ms = delay ? Math.min(1400, 350 + reply.text.length * 4) : 0;
      window.setTimeout(() => {
        setTyping(false);
        setBubbles((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "agent",
            text: reply.text,
            chips: reply.chips,
            variant: reply.variant,
          },
        ]);
        resolve();
      }, ms);
    });
  }, []);

  const sendRef = useRef<(text: string, action?: WidgetAction) => void>(
    () => {},
  );
  const send = useCallback(
    async (text: string, action: WidgetAction = "send") => {
      if (busy) return;
      const trimmed = text.trim();
      if (!trimmed && action === "send") return;
      setError(null);
      setBusy(true);
      if (trimmed) {
        setBubbles((prev) => [
          ...prev,
          { id: nextId(), role: "user", text: trimmed },
        ]);
      }
      setDraft("");
      try {
        if (config.localPreview && config.knowledgeBase) {
          const reply: AgentReply =
            action === "ask"
              ? {
                  text: "Sure — ask a question about the help content you just saved.",
                }
              : (() => {
                  const match = trimmed
                    ? retrieveFromKnowledgeBase(
                        trimmed,
                        config.knowledgeBase as KbEntry[],
                      )
                    : null;
                  return match
                    ? {
                        text: match.entry.answer,
                        variant:
                          match.entry.kind === "troubleshooting"
                            ? "info"
                            : "success",
                      }
                    : {
                        text: `I don't have that in ${config.businessName}'s help content, and I'd rather not guess. I can pass it to a human on the support team if you need a definitive answer.`,
                        variant: "warning",
                        chips: [
                          { label: "Ask another question", action: "ask" },
                        ],
                      };
                })();
          setStorage({ configured: false, ok: true });
          await pushAgent(reply);
        } else {
          const res = await chatTurn({
            data: {
              businessId: config.businessId,
              conversationId: conversationRef.current,
              message: trimmed,
              action,
              state: stateRef.current,
            },
          });
          stateRef.current = res.state;
          conversationRef.current = res.conversationId;
          setStorage(res.storage);
          for (const reply of res.replies) {
            await pushAgent(reply);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong sending that.",
        );
        setTyping(false);
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, config.businessId, pushAgent],
  );
  sendRef.current = (text, action) => void send(text, action ?? "send");

  // Open with a greeting; close on Escape.
  useEffect(() => {
    if (open && bubbles.length === 0) {
      const timer = window.setTimeout(() => {
        void pushAgent(
          {
            text: config.greeting,
            chips: [
              ...config.quickActions,
              ...config.suggestions.map((s) => ({
                label: s,
                action: "send" as WidgetAction,
              })),
            ],
          },
          false,
        );
      }, 350);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [
    open,
    bubbles.length,
    config.greeting,
    config.quickActions,
    config.suggestions,
    pushAgent,
  ]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Let the host page open the widget from its own buttons:
  //   window.dispatchEvent(new CustomEvent("frontdesk:open"))
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("frontdesk:open", onOpen);
    return () => window.removeEventListener("frontdesk:open", onOpen);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [bubbles, typing]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`fixed bottom-4 ${side} z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:bottom-6`}
          style={{ backgroundColor: accent }}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat with {config.businessName}</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label={`${config.title} chat`}
          className={`fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 ${side} sm:h-[600px] sm:max-h-[80dvh] sm:w-[400px] sm:rounded-2xl`}
        >
          <header
            className="flex items-start gap-3 px-4 py-3 text-white"
            style={{ backgroundColor: accent }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {config.businessName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{config.title}</h2>
              <p className="truncate text-xs text-white/80">
                {config.subtitle ?? "Answers, fixes, tickets and demos"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-white/90 transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          {storage && !storage.ok && (
            <p
              role="status"
              className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] leading-snug text-amber-900"
            >
              <strong>Storage not connected.</strong> Answers and
              troubleshooting work, but tickets and demo requests cannot be
              saved until the help desk database is connected — nothing is
              stored and no reference number is issued.
            </p>
          )}

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
          >
            {bubbles.map((bubble) => (
              <div
                key={bubble.id}
                className={
                  bubble.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={
                      bubble.role === "user"
                        ? "whitespace-pre-line rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white"
                        : `whitespace-pre-line rounded-2xl rounded-bl-sm border px-3 py-2 text-sm ${
                            bubble.variant === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                              : bubble.variant === "warning"
                                ? "border-amber-200 bg-amber-50 text-amber-950"
                                : "border-slate-200 bg-white text-slate-800"
                          }`
                    }
                    style={
                      bubble.role === "user"
                        ? { backgroundColor: accent }
                        : undefined
                    }
                  >
                    {bubble.text}
                  </div>
                  {bubble.chips && bubble.chips.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {bubble.chips.map((chip) => (
                        <button
                          key={`${bubble.id}-${chip.label}`}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            sendRef.current(chip.label, chip.action ?? "send")
                          }
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div
                className="flex justify-start"
                aria-label="Help desk is typing"
              >
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
              >
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3"
          >
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Message
            </label>
            <input
              id={`${panelId}-input`}
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask a question…"
              autoComplete="off"
              disabled={busy}
              className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-300 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={busy || draft.trim().length === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-40"
              style={{ backgroundColor: accent }}
              aria-label="Send message"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
          <p className="border-t border-slate-100 bg-white px-3 py-1.5 text-center text-[10px] text-slate-400">
            Help desk by Frontdesk AI · answers come from {config.businessName}
            &apos;s own help content
          </p>
        </section>
      )}
    </>
  );
}
