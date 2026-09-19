/**
 * Public plan catalogue. Keep commercial terms here so names, caps, prices and
 * hosted checkout links can change without touching metering or UI logic.
 *
 * paymentLinkUrl is intentionally nullable: the app never calls Stripe and
 * does not hold a Stripe secret. Once the owner creates a hosted Payment Link,
 * put its URL on the approved plan and the pricing CTA will hand off to it.
 */

export type PlanId = "free" | "starter" | "growth" | "pro";

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  conversationLimit: number;
  seats: number;
  branding: boolean;
  whiteLabel: boolean;
  paymentLinkUrl: string | null;
  description: string;
  highlights: string[];
}

export const plans: readonly PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    conversationLimit: 50,
    seats: 1,
    branding: true,
    whiteLabel: false,
    paymentLinkUrl: null,
    description: "A simple way to try an AI front desk.",
    highlights: ["50 conversations / month", "Frontdesk AI branding", "1 seat"],
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    conversationLimit: 300,
    seats: 1,
    branding: false,
    whiteLabel: false,
    paymentLinkUrl: "https://buy.stripe.com/8x214nf3vfn7av190f5os00",
    description: "For small teams ready to automate repeat questions.",
    highlights: ["300 conversations / month", "Branding removed", "1 seat"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 79,
    conversationLimit: 1000,
    seats: 3,
    branding: false,
    whiteLabel: false,
    paymentLinkUrl: "https://buy.stripe.com/aFa00jcVn0sdgTpdgv5os01",
    description: "More capacity and room for a growing front desk team.",
    highlights: ["1,000 conversations / month", "Branding removed", "3 seats"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 199,
    conversationLimit: 3000,
    seats: 3,
    branding: false,
    whiteLabel: true,
    paymentLinkUrl: "https://buy.stripe.com/3cIbJ108Bfn746D7Wb5os02",
    description: "High-volume support with a fully white-label experience.",
    highlights: ["3,000 conversations / month", "White-label widget", "3 seats"],
  },
];

export function getPlan(id: string | null | undefined): PlanConfig {
  return plans.find((plan) => plan.id === id) ?? plans[0];
}
