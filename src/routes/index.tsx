/**
 * The demo business page: "Cadence" — a fictional scheduling product for
 * clinics — with the Frontdesk AI help desk widget embedded on it.
 *
 * All copy and knowledge-base content comes from `~/content/business`, so the
 * whole demo can be re-skinned by editing that one file.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  HelpDeskWidget,
  type HelpDeskWidgetConfig,
} from "~/components/HelpDeskWidget";
import type { WidgetAction } from "~/server/engine";
import { business, helpDesk, knowledgeBase } from "~/content/business";
import { captureAttributionSource } from "~/client/attribution";

export const Route = createFileRoute("/")({
  component: Home,
});

const widgetConfig: HelpDeskWidgetConfig = {
  businessId: business.id,
  businessName: business.name,
  title: `${business.name} support`,
  subtitle: "Answers, fixes, tickets and demos",
  greeting: helpDesk.greeting,
  accent: "#0f766e",
  quickActions: [...helpDesk.quickActions],
  suggestions: [
    ...helpDesk.suggestions,
    "Is Cadence suitable for veterinary clinics?",
  ],
  position: "right",
};

const faqSuggestions = [
  "How much does Cadence cost?",
  "Is there a free trial?",
  "Which calendars do you sync with?",
  "How do I set up Cadence?",
  "Is Cadence HIPAA compliant?",
  "Is Cadence suitable for veterinary clinics?",
];

const trapQuestions = [
  "Do you offer reptile boarding?",
  "Can you diagnose my dog?",
  "Do you have a discount for new clients?",
];

const troubleSuggestions = [
  "My calendar isn't syncing",
  "Booking an appointment won't save",
  "I can't log in, how do I reset my password?",
  "Appointments are showing the wrong timezone",
  "My patient CSV import failed",
  "Reminders aren't being sent to patients",
];

function openWidget(action?: WidgetAction, message?: string) {
  window.dispatchEvent(
    new CustomEvent("frontdesk:open", {
      detail: { action, message },
    }),
  );
}

function Home() {
  useEffect(() => {
    captureAttributionSource();
  }, []);

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* Demo notice — this is our sample business page, not Frontdesk AI's own site */}
      <div className="bg-slate-900 px-4 py-2 text-center text-xs text-slate-200">
        {business.demoBanner}{" "}
        <a
          className="underline decoration-dotted hover:text-white"
          href="/setup"
        >
          Knowledge base setup
        </a>
        {" · "}
        <a
          className="underline decoration-dotted hover:text-white"
          href="/operator"
        >
          Operator view
        </a>
        {" · "}
        <a
          className="underline decoration-dotted hover:text-white"
          href="/install"
        >
          Install widget
        </a>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {business.name}
            </span>
          </div>
          <nav
            aria-label="Main"
            className="hidden gap-6 text-sm text-slate-600 sm:flex"
          >
            {business.nav.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="hover:text-slate-900"
              >
                {item}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={openWidget}
            className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Talk to us
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              {business.tagline}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {business.hero.headline}
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              {business.hero.subhead}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openWidget}
                className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                {business.hero.primaryCta}
              </button>
              <button
                type="button"
                onClick={() => openWidget("start_lead")}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                {business.hero.secondaryCta}
              </button>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              {business.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-slate-500">{stat.label}</dt>
                  <dd className="text-lg font-semibold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Today · Riverside Clinic
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  ["09:00", "Dr Alvarez · Follow-up", "Confirmed"],
                  ["09:30", "Dr Okafor · New patient", "Reminder sent"],
                  ["10:15", "Dr Alvarez · Telehealth", "Video link ready"],
                  ["11:00", "Open slot", "Booking page live"],
                ].map(([time, what, status]) => (
                  <li
                    key={time}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-500">
                        {time}
                      </span>
                      <span className="font-medium text-slate-800">{what}</span>
                    </span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Illustrative UI, not connected to a real clinic.
            </p>
          </div>
        </section>

        <section
          id="product"
          className="border-t border-slate-200 bg-slate-50 py-16"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Everything the front desk juggles, in one place
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              {business.shortDescription}
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {business.features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-12">
          <div className="mx-auto max-w-6xl px-4">
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  Try to break it
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  Ask something outside the help content
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  These questions are not in Cadence&apos;s seeded help content.
                  Watch the assistant say so plainly instead of inventing an
                  answer, then offer a ticket for a human to pick up.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-0 sm:max-w-md sm:justify-end">
                {trapQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => openWidget("send", question)}
                    className="rounded-full border border-teal-300 bg-white px-3 py-2 text-left text-sm font-medium text-teal-900 transition hover:border-teal-500 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="support" className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Support that answers before you queue
              </h2>
              <p className="mt-2 text-slate-600">
                The chat in the corner is our help desk. It answers from{" "}
                <span className="font-medium text-slate-800">
                  {knowledgeBase.length} help articles
                </span>
                , walks you through fixes step by step, files a ticket with a
                reference number when it cannot help, and books demo slots. Try
                one of these:
              </p>
              <ul className="mt-6 space-y-2">
                {faqSuggestions.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      onClick={openWidget}
                      className="text-left text-sm font-medium text-teal-800 underline decoration-teal-300 underline-offset-4 hover:decoration-teal-700"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Operator handoff preview
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      What a human sees next
                    </h3>
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Illustrative
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-amber-900">
                      <span>Ticket filed</span>
                      <span>Example</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      Ref TK-1042 · Calendar sync question
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      The transcript and customer&apos;s original question stay
                      attached.
                    </p>
                  </div>
                  <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-teal-900">
                      <span>Call slot offered</span>
                      <span>Example</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      Tue 10:00 ET · 30 minutes
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      A human confirms the selected demo time after the request
                      is saved.
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Example only — this preview is not a live ticket or calendar
                  slot. The widget creates real handoffs when its storage is
                  connected.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Common problems it can fix
                </h3>
                <ul className="mt-4 grid gap-2 text-sm text-slate-700">
                  {troubleSuggestions.map((topic) => (
                    <li key={topic} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600"
                      />
                      <button
                        type="button"
                        onClick={openWidget}
                        className="text-left hover:text-teal-800"
                      >
                        {topic}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                  If the help desk does not know an answer, it says so and
                  offers to pass the question to a human — it is not allowed to
                  invent pricing, policy or a fix.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm leading-6 text-slate-600">
            This whole support experience is Frontdesk AI — it answers from
            these {knowledgeBase.length} articles, books call slots, and files
            tickets with reference numbers. Add it to your site with one line,
            free for 50 conversations/month →{" "}
            <a
              className="font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-950"
              href="/install"
            >
              Install
            </a>{" "}
            ·{" "}
            <a
              className="font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-950"
              href="/pricing"
            >
              Pricing
            </a>
          </p>
        </section>

        <section
          id="integrations"
          className="border-t border-slate-200 bg-slate-50 py-16"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Works with what clinics already use
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Google Calendar",
                "Microsoft 365",
                "Outlook",
                "Apple Calendar (iCal)",
                "Stripe",
                "Twilio SMS",
                "Zoom",
                "Google Meet",
                "Zapier",
              ].map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Ask the help desk which calendars sync two-way, and what is{" "}
              <em>not</em> supported — it will tell you plainly.
            </p>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Plans</h2>
          <p className="mt-2 text-slate-600">
            Billed per location, per month. Every plan includes the booking page
            and two-way calendar sync.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              [
                "Starter",
                "$59",
                "1 location, up to 5 staff, online booking, email reminders",
              ],
              [
                "Growth",
                "$149",
                "Up to 20 staff, SMS reminders, waitlists, reporting",
              ],
              [
                "Enterprise",
                "Custom",
                "Multi-location, SSO/SAML, API and FHIR export",
              ],
            ].map(([name, price, blurb]) => (
              <article
                key={name}
                className="flex flex-col rounded-2xl border border-slate-200 p-6"
              >
                <h3 className="font-semibold">{name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {price}
                  {price.startsWith("$") && (
                    <span className="text-sm font-normal text-slate-500">
                      /mo
                    </span>
                  )}
                </p>
                <p className="mt-3 flex-1 text-sm text-slate-600">{blurb}</p>
                <button
                  type="button"
                  onClick={openWidget}
                  className="mt-5 rounded-full border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  Ask about {name}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-900 py-10 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm">
          <p className="font-semibold text-white">{business.name}</p>
          <p>{business.shortDescription}</p>
          <p>Support: {business.supportHours}</p>
          <p className="text-xs text-slate-400">{business.footerNote}</p>
        </div>
      </footer>

      <HelpDeskWidget config={widgetConfig} />
    </div>
  );
}
