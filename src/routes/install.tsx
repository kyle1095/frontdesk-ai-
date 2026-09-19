import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { siteOrigin } from "~/server/api";
import * as auth from "~/server/auth";

export const Route = createFileRoute("/install")({
  loader: async () => {
    const origin = await siteOrigin();
    const account = await auth.currentAccount().catch(() => null);
    return { origin, account };
  },
  component: InstallPage,
});

function InstallPage() {
  const { origin, account } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);
  const slug = account?.businessSlug ?? "cadence";
  const businessName = account?.businessName ?? "Cadence";
  const snippet = `<script src="${origin}/widget.js" data-business="${slug}" data-accent-color="#0f766e"></script>`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Frontdesk AI
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Install the {businessName} widget
            </h1>
          </div>
          <a
            href="/"
            className="text-sm font-semibold text-teal-700 underline underline-offset-4"
          >
            ← Back to demo
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            One line to try it
          </p>
          <h2 className="mt-2 text-2xl font-bold text-teal-950">
            Add the chat to another website
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-950">
            {account ? `This widget answers from ${businessName}'s own saved help content. Add the script to your site and customers will get deterministic answers, troubleshooting and human handoff.` : "This is the Cadence demo help desk. It answers from seeded Cadence content and demonstrates deterministic answers, troubleshooting and human handoff."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-teal-200 bg-white px-4 py-3 text-xs leading-6 text-slate-800">
              {snippet}
            </code>
            <button
              type="button"
              onClick={copySnippet}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {copied ? "Copied" : "Copy script"}
            </button>
          </div>
          <p className="mt-3 text-xs text-teal-900">
            {account ? <>This snippet is configured for <strong>{businessName}</strong> ({slug}).</> : <>Sign in to see your own business snippet. Visitors see the Cadence demo snippet.</>} The iframe keeps widget styles isolated from the host page.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Setup
            </p>
            <h2 className="mt-2 text-xl font-semibold">Three steps</h2>
            <ol className="mt-5 space-y-5 text-sm leading-6 text-slate-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                  1
                </span>
                <span>Copy the script tag above.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                  2
                </span>
                <span>
                  Paste it into the HTML of your site, just before{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    &lt;/body&gt;
                  </code>
                  .
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                  3
                </span>
                <span>
                  Publish the page, then use the “Chat with {businessName}” launcher in
                  the lower-right corner.
                </span>
              </li>
            </ol>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
              {account ? <><strong>Your workspace:</strong> this widget uses your saved knowledge-base entries. Add or edit answers from the operator view at <a className="font-semibold underline" href="/operator">/operator</a>.</> : <><strong>Demo:</strong> sign in for a per-business install snippet. Visitors see the seeded Cadence demo.</>}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-2 truncate rounded bg-white px-2 py-1 text-[10px] text-slate-500">
                your-business.example
              </span>
            </div>
            <div className="relative min-h-[560px] bg-gradient-to-br from-white to-slate-100 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Mock host page
              </p>
              <h2 className="mt-3 max-w-sm text-2xl font-bold tracking-tight">
                A normal website, with help in the corner.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                The frame below is the same isolated widget route the loader
                mounts. Ask “How much does Cadence cost?” to see a grounded
                answer.
              </p>
              <div className="mt-6 flex gap-3">
                <span className="h-2 w-20 rounded-full bg-slate-200" />
                <span className="h-2 w-12 rounded-full bg-slate-200" />
                <span className="h-2 w-16 rounded-full bg-slate-200" />
              </div>
              <iframe
                title={`Embedded ${businessName} widget preview`}
                src={`/widget?accent=%230f766e&business=${encodeURIComponent(slug)}`}
                className="mt-6 h-[430px] w-full rounded-xl border-0 bg-transparent"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
