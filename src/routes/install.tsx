import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { installData } from "~/server/api";
import { MarketingNav } from "~/components/marketing/Nav";
import { MarketingFooter } from "~/components/marketing/Footer";

export const Route = createFileRoute("/install")({
  loader: async () => {
    return await installData();
  },
  component: InstallPage,
});

function InstallPage() {
  const { origin, account } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);
  const slug = account?.businessSlug ?? "cadence";
  const businessName = account?.businessName ?? "Cadence";
  const snippet = `<script src="${origin}/widget.js" data-business="${slug}" data-accent-color="#2dd4bf"></script>`;

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
    <div className="bg-rc-bg font-sans text-rc-text">
      <MarketingNav active="install" />

      <header className="px-4 pb-0 pt-24 text-center sm:px-10">
        <div className="mx-auto max-w-[640px]">
          <p className="font-heading text-lg text-rc-accent">Get started</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold text-rc-text sm:text-[40px]">
            Live in about ten minutes.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-rc-text-secondary sm:text-xl">
            Add the {businessName} widget to a site with one line of script.
          </p>
        </div>
        <a
          href="/demo"
          className="mt-6 inline-block text-sm font-semibold text-rc-accent underline underline-offset-4 hover:text-rc-text"
        >
          ← Back to demo
        </a>
      </header>

      <main className="mx-auto max-w-[1160px] space-y-8 px-4 pb-24 pt-16 sm:px-10">
        <section className="rounded-xl border border-rc-border bg-rc-card p-7">
          <p className="font-heading text-sm font-bold text-rc-text">
            One line to try it
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-rc-text-secondary">
            {account
              ? `This widget answers from ${businessName}'s own saved help content. Add the script to your site and customers will get deterministic answers, troubleshooting and human handoff.`
              : "This is the Cadence demo help desk. It answers from seeded Cadence content and demonstrates deterministic answers, troubleshooting and human handoff."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-rc-border bg-rc-hero px-4 py-3 font-mono text-xs leading-6 text-rc-code">
              {snippet}
            </code>
            <button
              type="button"
              onClick={copySnippet}
              className="shrink-0 rounded-xl bg-rc-accent px-4 py-3 font-heading text-sm font-bold text-rc-on-accent transition hover:brightness-95"
            >
              {copied ? "Copied" : "Copy script"}
            </button>
          </div>
          <p className="mt-3 text-xs text-rc-text-tertiary">
            {account ? (
              <>
                This snippet is configured for <strong className="text-rc-text-secondary">{businessName}</strong> ({slug}).
              </>
            ) : (
              <>Sign in to see your own business snippet. Visitors see the Cadence demo snippet.</>
            )}{" "}
            The iframe keeps widget styles isolated from the host page.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-rc-border bg-rc-card p-7">
            <p className="font-heading text-sm font-bold text-rc-text">Setup</p>
            <h2 className="mt-2 font-heading text-xl font-bold text-rc-text">Three steps</h2>
            <ol className="mt-5 space-y-5 text-sm leading-6 text-rc-text-secondary">
              <li className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rc-accent font-heading text-sm font-extrabold text-rc-on-accent">
                  1
                </span>
                <span className="pt-1.5">Copy the script tag above.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rc-accent font-heading text-sm font-extrabold text-rc-on-accent">
                  2
                </span>
                <span className="pt-1.5">
                  Paste it into the HTML of your site, just before{" "}
                  <code className="rounded bg-rc-card-raised px-1.5 py-0.5 text-xs text-rc-code">&lt;/body&gt;</code>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rc-accent font-heading text-sm font-extrabold text-rc-on-accent">
                  3
                </span>
                <span className="pt-1.5">
                  Publish the page, then use the &quot;Chat with {businessName}&quot; launcher in the lower-right corner.
                </span>
              </li>
            </ol>
            <div className="mt-6 rounded-xl border border-rc-border bg-rc-card-raised p-4 text-xs leading-5 text-rc-text-on-raised">
              {account ? (
                <>
                  <strong className="text-rc-text">Your workspace:</strong> this widget uses your saved knowledge-base entries. Add or edit answers from the operator view at{" "}
                  <a className="font-semibold text-rc-accent underline" href="/operator">
                    /operator
                  </a>
                  .
                </>
              ) : (
                <>
                  <strong className="text-rc-text">Demo:</strong> sign in for a per-business install snippet. Visitors see the seeded Cadence demo.
                </>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-rc-border bg-rc-card">
            <div className="flex items-center gap-2 border-b border-rc-border bg-rc-hero px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rc-border-muted" />
              <span className="h-2.5 w-2.5 rounded-full bg-rc-border-muted" />
              <span className="h-2.5 w-2.5 rounded-full bg-rc-border-muted" />
              <span className="ml-2 truncate rounded bg-rc-card px-2 py-1 text-[10px] text-rc-text-tertiary">
                your-business.example
              </span>
            </div>
            <div className="relative min-h-[560px] bg-rc-card p-7">
              <p className="font-heading text-xs font-bold uppercase tracking-[0.16em] text-rc-text-tertiary">
                Mock host page
              </p>
              <h2 className="mt-3 max-w-sm font-heading text-2xl font-bold text-rc-text">
                A normal website, with help in the corner.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-rc-text-secondary">
                The frame below is the same isolated widget route the loader mounts. Ask &quot;How much does Cadence cost?&quot; to see a grounded answer.
              </p>
              <div className="mt-6 flex gap-3">
                <span className="h-2 w-20 rounded-full bg-rc-card-raised" />
                <span className="h-2 w-12 rounded-full bg-rc-card-raised" />
                <span className="h-2 w-16 rounded-full bg-rc-card-raised" />
              </div>
              <iframe
                title={`Embedded ${businessName} widget preview`}
                src={`/widget?accent=%232dd4bf&business=${encodeURIComponent(slug)}`}
                className="mt-6 h-[430px] w-full rounded-xl border-0 bg-transparent"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-rc-border bg-rc-card p-8 text-center">
          <h2 className="font-heading text-2xl font-extrabold text-rc-text sm:text-[28px]">
            Ready to stop repeating yourself?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-rc-text-secondary">
            Start free — 50 conversations a month, no card required.
          </p>
          <a
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-rc-accent px-8 py-3.5 font-heading text-base font-bold text-rc-on-accent transition hover:brightness-95"
          >
            Get started free
          </a>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
