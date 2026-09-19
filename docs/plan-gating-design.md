# Plan gating and checkout handoff

Plan terms live in `src/config/plans.ts`, the public single source of truth for plan IDs, prices, monthly conversation caps, seats, branding, and nullable hosted checkout URLs. The owner can change those values independently of metering and page rendering.

The app counts conversations in Postgres by `business_id` and the current calendar month (`conversations.created_at`). Before creating a new conversation, `/api/chat` loads the business plan and usage; at the cap it returns a polite upgrade reply without creating a row. The response also carries the branding requirement so Free always shows the Frontdesk AI footer while paid plans can hide it.

Checkout is deliberately Stripe-key-free. When a paid plan is approved, the lead creates a Stripe Payment Link using the platform's Stripe tooling and places that hosted URL in the plan's `paymentLinkUrl`. The pricing CTA then links directly to that hosted checkout; this app never calls Stripe or stores a Stripe secret. Until a link is supplied, the CTA is disabled with a “Coming shortly” note.
