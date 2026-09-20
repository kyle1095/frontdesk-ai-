/**
 * ReceptIO marketing homepage.
 *
 * Visual design: ReceptIO-Website-Package/ReceptIO-Design-Handoff.docx.
 * The live demo panel below is an illustrative mockup (a fictional
 * "Cadence Dental Care" site); the real interactive widget lives at /demo.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingNav } from "~/components/marketing/Nav";
import { MarketingFooter } from "~/components/marketing/Footer";
import { plans } from "~/config/plans";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const DEMO_ANSWERS = {
  hours: {
    chip: "What are your hours?",
    answer: "We're open Monday to Friday, 8am to 5pm, and Saturday 9am to 1pm.",
  },
  walkins: {
    chip: "Do you accept walk-ins?",
    answer: "We see walk-ins when we have openings, but booking ahead guarantees your spot.",
  },
  pricing: {
    chip: "How much is a cleaning?",
    answer: "A routine cleaning is $120 without insurance. Most PPO plans cover it in full.",
  },
} as const;

type DemoKey = keyof typeof DEMO_ANSWERS;

const FEATURES = [
  {
    title: "Answers from your content only",
    body: "It reads the help articles, FAQs, and policies you give it, and answers only from those.",
  },
  {
    title: "One line to install",
    body: "Paste a single script tag into your site. No developer or long setup required.",
  },
  {
    title: "Ticket or call-slot handoff",
    body: "When it doesn't know, it hands off cleanly to a ticket or a weekday call a person confirms.",
  },
  {
    title: "Works alongside what you use",
    body: "It sits next to your existing booking and calendar tools instead of replacing them.",
  },
] as const;

function FeatureIcon({ index }: { index: number }) {
  return (
    <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rc-accent/[0.18] shadow-[0_0_0_8px_rgba(45,212,191,0.08)]">
      {index === 0 && (
        <span className="flex flex-col items-center gap-1">
          <span className="h-[3px] w-[22px] rounded-sm bg-rc-accent" />
          <span className="h-[3px] w-[17px] rounded-sm bg-rc-accent" />
          <span className="h-[3px] w-[22px] rounded-sm bg-rc-accent" />
        </span>
      )}
      {index === 1 && <span className="h-1.5 w-[30px] rounded bg-rc-accent" />}
      {index === 2 && (
        <span className="h-[30px] w-[30px] rounded-full border-4 border-rc-accent bg-rc-bg" />
      )}
      {index === 3 && (
        <span className="flex items-center">
          <span className="h-[22px] w-[22px] rounded-full bg-rc-accent" />
          <span className="-ml-2 h-[22px] w-[22px] rounded-full border-2 border-rc-accent bg-rc-bg" />
        </span>
      )}
    </span>
  );
}

function HomePage() {
  const [demoKey, setDemoKey] = useState<DemoKey>("hours");
  const teaserPlans = plans.filter((plan) => plan.id !== "pro");

  return (
    <div className="bg-rc-bg font-sans text-rc-text">
      <MarketingNav active="home" />

      {/* Hero */}
      <section className="px-4 pb-24 pt-20 text-center sm:px-10 sm:pb-24 sm:pt-24">
        <div className="mx-auto inline-flex items-center rounded-full border border-rc-border-muted px-[18px] py-2">
          <span className="font-heading text-sm font-semibold text-rc-text-secondary">
            For small, independent service businesses
          </span>
        </div>
        <h1 className="mx-auto mt-7 max-w-[780px] font-heading text-4xl font-extrabold leading-[1.15] text-rc-text sm:text-[58px]">
          Stop <span className="text-rc-accent">answering the same questions</span> all day.
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-lg leading-relaxed text-rc-text-secondary sm:text-xl">
          ReceptIO answers what your customers ask every day, using your own content — and honestly says &quot;I don&apos;t know&quot; instead of guessing.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="/install"
            className="rounded-lg bg-rc-accent px-8 py-4 font-heading text-base font-bold text-rc-on-accent transition hover:brightness-95"
          >
            Install it free
          </a>
          <a
            href="#refuse"
            className="rounded-lg border border-rc-border-muted px-7 py-4 font-heading text-base font-bold text-rc-text transition hover:border-rc-text-tertiary hover:bg-rc-card-raised"
          >
            See it answer a question it doesn&apos;t know
          </a>
        </div>

        {/* Illustrative live-demo mockup */}
        <div className="relative mx-auto mt-16 max-w-[1040px]">
          <div
            aria-hidden
            className="absolute left-1/2 top-5 h-[220px] w-[70%] -translate-x-1/2 rounded-full bg-rc-accent opacity-35 blur-[90px]"
          />
          <div className="relative overflow-hidden rounded-2xl border border-rc-border border-t-[3px] border-t-rc-accent bg-rc-card text-left shadow-[0_30px_70px_-15px_rgba(45,212,191,0.3)]">
            <div className="flex h-10 items-center gap-1.5 border-b border-rc-border bg-rc-hero px-4">
              <span className="h-[9px] w-[9px] rounded-full bg-rc-border-muted" />
              <span className="h-[9px] w-[9px] rounded-full bg-rc-border-muted" />
              <span className="h-[9px] w-[9px] rounded-full bg-rc-border-muted" />
              <span className="mx-auto text-[13px] text-rc-text-tertiary">cadencedentalcare.com</span>
            </div>
            <div className="relative min-h-[400px] bg-rc-card p-8 sm:p-12">
              <div className="mb-8 flex items-center justify-between">
                <span className="font-heading text-lg font-extrabold text-rc-text">Cadence Dental Care</span>
                <div className="hidden gap-6 sm:flex">
                  <span className="text-[13px] text-rc-text-tertiary">Services</span>
                  <span className="text-[13px] text-rc-text-tertiary">Team</span>
                  <span className="text-[13px] text-rc-text-tertiary">Book</span>
                </div>
              </div>
              <div className="mb-5 h-[140px] w-full rounded-[10px] bg-rc-card-raised" />
              <div className="mb-2.5 h-3 w-3/5 rounded bg-rc-card-raised" />
              <div className="mb-6 h-3 w-2/5 rounded bg-rc-card-raised" />
              <div className="inline-block rounded-lg bg-rc-accent px-[18px] py-2.5 text-[13px] font-semibold text-rc-on-accent">
                Book appointment
              </div>

              <div className="mt-8 w-full overflow-hidden rounded-[14px] border border-rc-border bg-rc-hero shadow-[0_16px_40px_-10px_rgba(45,212,191,0.35)] sm:absolute sm:bottom-10 sm:right-10 sm:mt-0 sm:w-[340px]">
                <div className="flex items-center gap-2.5 border-b border-rc-border px-[18px] py-4">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-rc-accent">
                    <span className="font-heading text-[13px] font-extrabold text-rc-on-accent">R</span>
                  </span>
                  <div>
                    <div className="font-heading text-[13px] font-bold text-rc-text">Ask Cadence Dental Care</div>
                    <div className="text-[11px] text-rc-text-tertiary">Powered by ReceptIO</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 pb-1.5 pt-3.5">
                  {(Object.keys(DEMO_ANSWERS) as DemoKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDemoKey(key)}
                      className={
                        "rounded-full border px-3 py-2 text-xs font-semibold transition " +
                        (demoKey === key
                          ? "border-rc-accent bg-rc-accent text-rc-on-accent"
                          : "border-transparent bg-rc-card-raised text-rc-text-on-raised hover:brightness-110")
                      }
                    >
                      {DEMO_ANSWERS[key].chip}
                    </button>
                  ))}
                </div>
                <div className="min-h-[88px] px-4 pb-4 pt-2">
                  <div className="rounded-[4px_12px_12px_12px] bg-rc-card-raised p-3.5 text-[13px] leading-relaxed text-rc-text-on-raised">
                    {DEMO_ANSWERS[demoKey].answer}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-[1040px] text-center text-xs text-rc-text-tertiary">
          Illustrative mockup — see the widget answer for real in the{" "}
          <a href="/demo" className="underline decoration-dotted hover:text-rc-text-secondary">
            live demo
          </a>
          .
        </p>
      </section>

      {/* Refuse to guess */}
      <section id="refuse" className="bg-rc-hero px-4 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div>
            <p className="font-heading text-lg text-rc-accent">The honest part</p>
            <h2 className="mt-2 font-heading text-3xl font-extrabold leading-tight text-rc-text sm:text-4xl">
              Watch it refuse to guess
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-rc-text-secondary">
              Most AI chat tools make something up when they don&apos;t know an answer. ReceptIO doesn&apos;t — it says so, and hands off cleanly instead.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-rc-border bg-rc-card p-6">
              <div className="mb-3 flex justify-end">
                <div className="max-w-[85%] rounded-[12px_12px_4px_12px] bg-rc-accent px-4 py-3 text-sm text-rc-on-accent">
                  Do you have a payment plan for orthodontic work?
                </div>
              </div>
              <div className="mb-4 flex justify-start">
                <div className="max-w-[85%] rounded-[4px_12px_12px_12px] bg-rc-card-raised px-4 py-3 text-sm leading-relaxed text-rc-text-on-raised">
                  I don&apos;t have that in the help content I can see, and I&apos;d rather not guess. I&apos;ve filed a ticket so a person can follow up.
                </div>
              </div>
              <div className="rounded-[10px] border border-dashed border-rc-accent bg-rc-card-raised p-4">
                <div className="mb-1 font-heading text-sm font-bold text-rc-text">Support ticket #RCP-48213 filed</div>
                <div className="text-[13px] text-rc-text-secondary">Cadence Dental Care will follow up by email within one business day.</div>
              </div>
            </div>
            <div className="rounded-xl border border-rc-border bg-rc-card p-6">
              <div className="mb-3 flex justify-end">
                <div className="max-w-[85%] rounded-[12px_12px_4px_12px] bg-rc-accent px-4 py-3 text-sm text-rc-on-accent">
                  Can someone walk me through my specific insurance coverage?
                </div>
              </div>
              <div className="mb-4 flex justify-start">
                <div className="max-w-[85%] rounded-[4px_12px_12px_12px] bg-rc-card-raised px-4 py-3 text-sm leading-relaxed text-rc-text-on-raised">
                  That&apos;s outside what I can answer from the help content here, so I&apos;d rather not guess. I can offer a quick call instead.
                </div>
              </div>
              <div className="rounded-[10px] border border-dashed border-rc-accent bg-rc-card-raised p-4">
                <div className="mb-1 font-heading text-sm font-bold text-rc-text">30-minute call offered — Tuesday, 2:00 PM</div>
                <div className="text-[13px] text-rc-text-secondary">A member of the Cadence Dental Care team confirms every slot.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-rc-bg px-4 py-24 sm:px-10">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="font-heading text-lg text-rc-accent">Features</p>
          <h2 className="mt-2 font-heading text-3xl font-extrabold text-rc-text sm:text-4xl">
            Built around one rule: never guess
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-rc-text-secondary sm:text-xl">
            ReceptIO does a few things well, and nothing beyond what your content supports.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-[1160px] grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <article key={feature.title} className="p-6 text-center">
              <FeatureIcon index={index} />
              <h3 className="mb-2.5 font-heading text-lg font-bold text-rc-text">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-rc-text-secondary">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-rc-hero px-4 py-24 sm:px-10">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="font-heading text-lg text-rc-accent">Pricing</p>
          <h2 className="mt-2 font-heading text-3xl font-extrabold text-rc-text sm:text-4xl">Simple, flat plans</h2>
          <p className="mt-4 text-lg leading-relaxed text-rc-text-secondary sm:text-xl">
            Three of our four tiers, shown here. No per-resolution fees, ever.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-[1160px] grid-cols-1 items-start gap-7 sm:grid-cols-3">
          {teaserPlans.map((plan) => {
            const popular = plan.id === "growth";
            return (
              <div
                key={plan.id}
                className={
                  "relative rounded-xl border bg-rc-card p-7 " +
                  (popular
                    ? "border-2 border-rc-accent shadow-[0_20px_45px_-15px_rgba(45,212,191,0.25)] sm:scale-[1.06]"
                    : "border-rc-border")
                }
              >
                {popular && (
                  <span className="absolute -top-3 left-7 rounded-full bg-rc-accent px-3 py-1 font-heading text-xs font-bold text-rc-on-accent">
                    Most popular
                  </span>
                )}
                <div className="mb-3 font-heading text-lg font-extrabold text-rc-text">{plan.name}</div>
                <div className="mb-4">
                  <span className="font-heading text-3xl font-extrabold text-rc-text">
                    {plan.monthlyPrice === 0 ? "$0" : `$${plan.monthlyPrice}`}
                  </span>
                  <span className="text-sm text-rc-text-secondary"> /month</span>
                </div>
                <p className="text-sm leading-[1.9] text-rc-text-secondary">
                  {plan.highlights.join(" · ")}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <a
            href="/pricing"
            className="inline-block rounded-lg border border-rc-border-muted px-7 py-3.5 font-heading text-sm font-bold text-rc-text transition hover:border-rc-text-tertiary hover:bg-rc-card-raised"
          >
            See full pricing →
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
