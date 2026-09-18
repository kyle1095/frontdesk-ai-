import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HelpDeskWidget } from "~/components/HelpDeskWidget";
import { business, type KbEntry } from "~/content/business";
import {
  clearSavedKnowledgeBase,
  parseKnowledgeText,
  readSavedKnowledgeBase,
  saveKnowledgeBase,
  seededKnowledgeBase,
  STARTER_TEXT,
} from "~/knowledge-base";

export const Route = createFileRoute("/setup")({
  component: KnowledgeBaseSetup,
});

const previewSuggestions = [
  "Ask about our support hours",
  "How do I reset my password?",
];

function KnowledgeBaseSetup() {
  const [entries, setEntries] = useState<KbEntry[]>(() =>
    seededKnowledgeBase(),
  );
  const [source, setSource] = useState(STARTER_TEXT);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("Loading browser-local knowledge base…");

  useEffect(() => {
    const saved = readSavedKnowledgeBase();
    if (saved?.length) {
      setEntries(saved);
      setNotice(
        `Loaded ${saved.length} saved entr${saved.length === 1 ? "y" : "ies"} from this browser.`,
      );
    } else {
      setNotice(
        "Using the seeded Cadence demo content. Edit it or paste your own content.",
      );
    }
    setHydrated(true);
  }, []);

  const previewConfig = useMemo(
    () => ({
      businessId: `${business.id}-preview`,
      businessName: business.name,
      title: `${business.name} preview`,
      subtitle: "Testing your browser-local help content",
      greeting:
        "Hi — this preview answers only from the entries you have saved here. Try a question from the list or ask something unrelated to see the handoff.",
      accent: "#0f766e",
      quickActions: [],
      suggestions: previewSuggestions,
      knowledgeBase: entries,
      localPreview: true,
      position: "right" as const,
    }),
    [entries],
  );

  const parse = () => {
    const parsed = parseKnowledgeText(source);
    if (!parsed.length) {
      setNotice(
        "I could not find any complete entries. Add a Q: question and A: answer to each block.",
      );
      return;
    }
    setEntries(parsed);
    setNotice(
      `Parsed ${parsed.length} entr${parsed.length === 1 ? "y" : "ies"}. Review them below, then save.`,
    );
  };

  const save = () => {
    saveKnowledgeBase(entries);
    setNotice(
      `Saved ${entries.length} entr${entries.length === 1 ? "y" : "ies"} in this browser only.`,
    );
  };

  const reset = () => {
    clearSavedKnowledgeBase();
    const seeded = seededKnowledgeBase();
    setEntries(seeded);
    setNotice(
      "Reset to the seeded Cadence demo content. Save if you want to keep this as the local KB.",
    );
  };

  const addEntry = () => {
    setEntries((current) => [
      ...current,
      {
        id: `custom-entry-${Date.now()}`,
        category: "product",
        kind: "faq",
        title: "New help entry",
        question: "What should customers ask?",
        answer: "Add the grounded answer here.",
        keywords: ["help"],
      },
    ]);
  };

  const updateEntry = (id: string, patch: Partial<KbEntry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const deleteEntry = (id: string) =>
    setEntries((current) => current.filter((entry) => entry.id !== id));

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Frontdesk AI setup
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Teach your help desk what to say
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Paste FAQs or documentation, review the entries, then try the chat
              before you publish.
            </p>
          </div>
          <a
            href="/"
            className="text-sm font-semibold text-teal-700 underline underline-offset-4"
          >
            ← Back to Cadence demo
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  1. Paste your help content
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Use one blank-line-separated block per entry. The parser is
                  deterministic and does not send this text to an LLM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSource(STARTER_TEXT)}
                className="shrink-0 text-xs font-semibold text-teal-700 underline underline-offset-4"
              >
                Load sample
              </button>
            </div>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="mt-4 min-h-72 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              aria-label="FAQ or documentation text"
            />
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <strong className="text-slate-800">Format:</strong>{" "}
              <code>Q:</code> or <code>Question:</code>, then <code>A:</code> or{" "}
              <code>Answer:</code>. Optional: <code>Title:</code>,{" "}
              <code>Keywords:</code>, <code>Category:</code>,{" "}
              <code>Type: troubleshooting</code>, and numbered{" "}
              <code>Steps:</code>.
            </div>
            <button
              type="button"
              onClick={parse}
              className="mt-4 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Parse into entries
            </button>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
              How this works
            </p>
            <h2 className="mt-2 text-xl font-semibold text-teal-950">
              Grounded answers, with a clear boundary
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-teal-950">
              <li>
                <span className="font-semibold">Review first:</span> every
                parsed answer is editable or removable before it is used.
              </li>
              <li>
                <span className="font-semibold">Save locally:</span> this demo
                stores the current KB in this browser&apos;s local storage only
                — not in a database and not across devices.
              </li>
              <li>
                <span className="font-semibold">No guessing:</span> the preview
                only answers when deterministic retrieval finds a confident
                match. Otherwise it says it does not know and offers a human
                handoff.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={save}
                disabled={!hydrated}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Save current KB
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100"
              >
                Reset to seeded demo
              </button>
            </div>
            <p role="status" className="mt-4 text-xs text-teal-900">
              {notice}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="entries-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 id="entries-heading" className="text-lg font-semibold">
                2. Review entries{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({entries.length})
                </span>
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                The preview uses exactly what is shown here.
              </p>
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              + Add entry
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {entries.map((entry, index) => (
              <article key={entry.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Title
                        <input
                          value={entry.title}
                          onChange={(event) =>
                            updateEntry(entry.id, { title: event.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-teal-600"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Question
                        <input
                          value={entry.question}
                          onChange={(event) =>
                            updateEntry(entry.id, {
                              question: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                        />
                      </label>
                    </div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Grounded answer
                      <textarea
                        value={entry.answer}
                        onChange={(event) =>
                          updateEntry(entry.id, { answer: event.target.value })
                        }
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-teal-600"
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Keywords{" "}
                        <span className="font-normal normal-case">
                          (comma separated)
                        </span>
                        <input
                          value={entry.keywords.join(", ")}
                          onChange={(event) =>
                            updateEntry(entry.id, {
                              keywords: event.target.value
                                .split(",")
                                .map((word) => word.trim())
                                .filter(Boolean),
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category
                        <select
                          value={entry.category}
                          onChange={(event) =>
                            updateEntry(entry.id, {
                              category: event.target
                                .value as KbEntry["category"],
                            })
                          }
                          className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                        >
                          {[
                            "product",
                            "pricing",
                            "trial",
                            "sales",
                            "integrations",
                            "setup",
                            "policies",
                            "troubleshooting",
                          ].map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteEntry(entry.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {entries.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                No entries yet. Paste content above or add one manually.
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="preview-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              3. Preview the chat
            </p>
            <h2 id="preview-heading" className="mt-2 text-xl font-semibold">
              Try the answers before installing
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open the chat launcher in the lower-right corner. Ask a question
              from an entry, then ask something unrelated such as “Can you
              recommend a restaurant?” to verify the human-handoff response.
            </p>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("frontdesk:open"))
              }
              className="mt-4 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Open preview chat
            </button>
          </div>
        </section>
      </main>

      <HelpDeskWidget config={previewConfig} />
    </div>
  );
}
