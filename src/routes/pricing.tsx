import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { accountPlan } from "~/server/api";
import { plans } from "~/config/plans";
import type { BusinessPlanUsage } from "~/server/store";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

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
    <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Frontdesk AI</a>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Plans that scale with your front desk</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">Start free, then move up when your help desk needs more conversations, seats or a fully white-label experience.</p>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            <a href="/login" className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:border-slate-400">Sign in</a>
            <a href="/signup" className="rounded-lg bg-teal-700 px-3 py-2 text-white hover:bg-teal-800">Create account</a>
          </div>
        </header>

        {current && (
          <section className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-5" aria-label="Current plan and usage">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Your current plan</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-bold">{current.plan.name}</h2>
              <span className="text-sm text-slate-700">{current.used.toLocaleString()} of {current.limit.toLocaleString()} conversations this month</span>
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-5 lg:grid-cols-4" aria-label="Pricing plans">
          {plans.map((plan) => {
            const isCurrent = current?.plan.id === plan.id;
            return (
              <article key={plan.id} className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${isCurrent ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"}`}>
                {isCurrent && <span className="absolute -top-3 left-5 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white">Current plan</span>}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm text-slate-600">{plan.description}</p>
                <p className="mt-6"><span className="text-4xl font-bold">${plan.monthlyPrice}</span><span className="text-sm text-slate-500"> / month</span></p>
                {plan.paymentLinkUrl ? (
                  <a href={plan.paymentLinkUrl} className="mt-6 rounded-lg bg-teal-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-teal-800">Choose {plan.name}</a>
                ) : (
                  <button type="button" disabled className="mt-6 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">Coming shortly</button>
                )}
                <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-700">
                  {plan.highlights.map((highlight) => <li key={highlight} className="flex gap-2"><span className="text-teal-700" aria-hidden>✓</span>{highlight}</li>)}
                </ul>
              </article>
            );
          })}
        </section>

        <p className="mt-8 text-center text-sm text-slate-500">Paid checkout is handed off to a hosted Stripe Payment Link. No Stripe secret is stored in this app.</p>
      </div>
    </main>
  );
}
