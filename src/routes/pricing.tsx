import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { accountPlan } from "~/server/api";
import { plans } from "~/config/plans";
import type { BusinessPlanUsage } from "~/server/store";
import { MarketingNav } from "~/components/marketing/Nav";
import { MarketingFooter } from "~/components/marketing/Footer";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const CHECK = (
  <span aria-hidden className="relative h-4 w-4 shrink-0">
    <span className="absolute left-0.5 top-[7px] h-0.5 w-1.5 rotate-45 rounded-sm bg-rc-accent" />
    <span className="absolute left-[5px] top-1 h-0.5 w-2.5 -rotate-45 rounded-sm bg-rc-accent" />
  </span>
);

const FAQ = [
  {
    q: "What counts as a conversation?",
    a: "Each new visitor chat session with the widget counts as one conversation, however many questions they ask within it.",
  },
  {
    q: "What happens if I go over my monthly limit?",
    a: "You'll get a polite prompt to upgrade. Nothing cuts off mid-conversation — every chat in progress finishes normally.",
  },
  {
    q: "How do I cancel?",
    a: "Cancel anytime from your account settings. You're only billed for the time you used, prorated.",
  },
] as const;

function PricingPage() {
  const [current, setCurrent] = useState<BusinessPlanUsage | null>(null);

  useEffect(() => {
    void accountPlan()
      .then((result) => {
        if (result.ok) setCurrent(result.plan);
      })
      .catch(() => {
        // Pricing is public; an unavailable session should not block the page.
      });
  }, []);

  return (
    <div className="bg-rc-bg font-sans text-rc-text">
      <MarketingNav active="pricing" />

      <header className="px-4 pb-0 pt-24 text-center sm:px-10">
        <div className="mx-auto max-w-[640px]">
          <p className="font-heading text-lg text-rc-accent">Pricing</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold text-rc-text sm:text-[40px]">
            One flat price. No per-resolution surprises.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-rc-text-secondary sm:text-xl">
            Every plan is a flat monthly price. Add more conversations or seats as you grow — nothing changes mid-month.
          </p>
        </div>
        <div className="mx-auto mt-6 flex max-w-[640px] justify-center gap-3 text-sm font-semibold">
          <a href="/login" className="rounded-lg border border-rc-border-muted px-4 py-2 text-rc-text hover:bg-rc-card-raised">
            Sign in
          </a>
          <a href="/signup" className="rounded-lg bg-rc-accent px-4 py-2 text-rc-on-accent hover:brightness-95">
            Create account
          </a>
        </div>
      </header>

      {current && (
        <div className="mx-auto mt-10 max-w-[1200px] px-4 sm:px-10">
          <section
            className="rounded-xl border border-rc-accent/40 bg-rc-card-raised p-5"
            aria-label="Current plan and usage"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-rc-accent">Your current plan</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-heading text-xl font-bold text-rc-text">{current.plan.name}</h2>
              <span className="text-sm text-rc-text-secondary">
                {current.used.toLocaleString()} of {current.limit.toLocaleString()} conversations this month
              </span>
            </div>
          </section>
        </div>
      )}

      <section className="px-4 pb-0 pt-16 sm:px-10" aria-label="Pricing plans">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = current?.plan.id === plan.id;
            const popular = plan.id === "growth";
            return (
              <article
                key={plan.id}
                className={
                  "relative flex flex-col rounded-xl p-[26px] " +
                  (popular
                    ? "border-2 border-rc-accent bg-rc-card shadow-[0_20px_45px_-15px_rgba(45,212,191,0.25)] lg:scale-[1.05]"
                    : "border border-rc-border bg-rc-card") +
                  (isCurrent && !popular ? " ring-2 ring-rc-accent/50" : "")
                }
              >
                {popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-rc-accent px-3 py-1 font-heading text-xs font-bold text-rc-on-accent">
                    Most popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-6 rounded-full bg-rc-card-raised px-3 py-1 text-xs font-semibold text-rc-text">
                    Current plan
                  </span>
                )}
                <div className="mb-2.5 font-heading text-lg font-extrabold text-rc-text">{plan.name}</div>
                <div className="mb-[18px]">
                  <span className="font-heading text-[30px] font-extrabold text-rc-text">${plan.monthlyPrice}</span>
                  <span className="text-[13px] text-rc-text-secondary"> /month</span>
                </div>
                <ul className="mb-5 space-y-2.5">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2">
                      {CHECK}
                      <span className="text-sm text-rc-text-on-raised">{highlight}</span>
                    </li>
                  ))}
                </ul>
                {plan.paymentLinkUrl ? (
                  <a
                    href={plan.paymentLinkUrl}
                    className={
                      "mt-auto rounded-lg py-3 text-center font-heading text-sm font-bold transition " +
                      (popular
                        ? "bg-rc-accent text-rc-on-accent hover:brightness-95"
                        : "border border-rc-border-muted text-rc-text hover:bg-rc-card-raised")
                    }
                  >
                    Get started
                  </a>
                ) : plan.id === "free" ? (
                  <a
                    href="/signup"
                    className="mt-auto rounded-lg border border-rc-border-muted py-3 text-center font-heading text-sm font-bold text-rc-text transition hover:bg-rc-card-raised"
                  >
                    Get started
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-auto cursor-not-allowed rounded-lg border border-rc-border py-3 text-center font-heading text-sm font-bold text-rc-text-tertiary"
                  >
                    Coming shortly
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="px-4 pt-10 text-center sm:px-10">
        <p className="mx-auto max-w-[720px] text-base leading-relaxed text-rc-text-secondary">
          Unlike per-resolution AI pricing elsewhere — Intercom Fin charges $0.99 per resolution — every ReceptIO tier is a flat monthly price. Predictable, even when your call volume is lumpy.
        </p>
        <p className="mx-auto mt-3 max-w-[720px] text-sm text-rc-text-tertiary">
          Paid checkout is handed off to a hosted Stripe Payment Link. No Stripe secret is stored in this app.
        </p>
      </div>

      <section className="px-4 pb-0 pt-24 sm:px-10">
        <div className="mx-auto max-w-[700px]">
          <div className="mb-9 text-center">
            <p className="font-heading text-lg text-rc-accent">FAQ</p>
            <h2 className="mt-2 font-heading text-[32px] font-extrabold text-rc-text">Common questions</h2>
          </div>
          {FAQ.map((item, index) => (
            <div
              key={item.q}
              className={
                "border-t border-rc-border py-[22px] " + (index === FAQ.length - 1 ? "border-b" : "")
              }
            >
              <div className="mb-1.5 font-heading text-base font-bold text-rc-text">{item.q}</div>
              <div className="text-[15px] leading-relaxed text-rc-text-secondary">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="pt-24">
        <MarketingFooter />
      </div>
    </div>
  );
}
