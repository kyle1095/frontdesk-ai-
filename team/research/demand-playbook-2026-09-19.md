# Demand playbook — getting the Cadence demo in front of small-clinic owners

Draft 2026-09-19 · researcher v2 (supersedes earlier draft) · sources: `pricing-scan-2026-09-18.md` (competitor figures, browser-verified 2026-09-18), `site/src/content/business.ts` + `site/src/routes/index.tsx` (demo behavior, read 2026-09-19), ratified business plan (tiers/checkout). Channel items could NOT be re-verified live (browser unavailable) — anything shaky is marked **[unverified]**.

Ground rules: the owner does all outreach personally, through their own accounts. No bulk email exists in the product and none is assumed. Every touch is one-to-one, discloses who we are, tells the truth about what the widget does, and makes "no thanks" easy. No purchased lists, no mass DMs — that's abuse and gets accounts banned.

## 1. Target definition

**Who feels the pain daily (in outreach order):**
- **Practice manager / office manager — primary.** Lives in the interruption queue, is paid to fix ops, usually has budget authority or a one-hop line to the owner, and gathers in manager communities. They don't need convincing that the phone is a problem; they need to see a fix.
- **Owner-vet — buyer, harder reach.** Feels cost and after-hours load but is time-starved and peer-validated: they move when another vet or their manager vouches, not from cold copy.
- **Head tech / lead CSR — influencer, not buyer.** Feels the interruptions most and is the natural word-of-mouth vector; win them with "try the demo widget yourself."

**A well-qualified clinic (build the outreach list on these):** 1–3 locations, roughly 2–10 DVMs (matches the demo's own profile of a typical customer: 1–10 locations, 3–40 staff — `business.ts`, "Who is Cadence for?"); independent (not a corporate group — independents decide in a day, corporates have procurement); an active website whose contact flow is phone-first; **no chat widget installed today**; and ideally reviews or social posts mentioning unreachable phones / slow replies (direct evidence of the pain we sell).

## 2. Channels

Free unless marked. One-line "why" each. Global caveat: existence of these venues is common knowledge, but current status/eligibility/cost was **not** verifiable this session — check before relying on specifics.

**Communities / forums (join as a human first; read rules; value-first only)**
- **Reddit r/vettech and r/veterinary** — vet techs and owners vent about phone volume daily; comment helpfully, mention the demo only when relevant. Specific subreddit rules on self-promotion [unverified].
- **Facebook groups for vet practice managers / receptionists** — where non-DVM staff actually ask peers for tool recommendations. Exact group names/current activity [unverified].
- **VHMA (Veterinary Hospital Managers Association)** — the practice-manager persona assembled in one place; forums + annual meeting. Paid membership, cost [unverified].
- **VIN (Veterinary Information Network) message boards** — highest-trust peer forum for vets; only viable if eligible/members. Vets-only eligibility and cost [unverified].

**Industry publications / newsletters**
- **dvm360 (site, newsletter, Fetch conferences)** — the trade brand clinic staff actually read; the realistic route is a contributed article or case study, not an ad. Free to read; exhibit/paid [unverified cost].
- **Today's Veterinary Business** — written specifically for owners and managers; pitch a short honest piece ("what we learned putting an AI help desk on a clinic site"). Free [unverified current cadence].
- **AAHA (Trends magazine, AAHA Con, guidelines content)** — owner-vet credibility venue; accreditation crowd.
- **Andy Roark newsletter / Cone of Shame podcast / Uncharted Veterinary Conference** — owner- and manager-heavy audience; conference attendance is paid [unverified current schedule].

**Conferences / CE (attend before ever exhibiting)**
- **State VMA chapter meetings and local CE evenings** — cheap or free, small rooms, the owner can demo the widget live on a phone; best ROI-per-dollar at our size. Local schedule [unverified].
- **VetShow / AVMA Convention / AAHA Con** — walk the floor with the demo first; booth only after first revenue.

**Adjacent service providers (1:1 partnership email, never bulk)**
- **Vet booking/PIMS vendors — Vetstoria, ezyVet/IDEXX, Provet Cloud, PetDesk, Otto** [names unverified]: their customers are exactly our ICP and a chat widget complements (doesn't compete with) booking software; ask about integration-marketplace listings where they have one.
- **Vet answering services — Smith.ai (verified in our scan: $300+/mo bundles), PATLive, AnswerForce** [vet verticals unverified]: they already monetize missed-call pain — either a referral relationship or our honest "before" story ("the AI handles repeats, humans handle the rest").
- **Practice-management consultants** — they prescribe tools to owners for a living; a consultant who likes the demo can put it in front of a dozen clinics a month. Named individuals [unverified].

**Directories (prospecting sources, not ad slots)**
- **Google Maps / Yelp / AVMA-style "find a vet" finders** [free] — how the owner builds and qualifies the 30-clinic list: no widget + phone-first contact + review complaints about unreachable phones.

## 3. Message angles (honest, grounded in what the product verifiably does)

**Angle 1 — "The 12 questions your front desk repeats daily, answered from your own content."**
Grounded: the demo widget answers 12 FAQs and runs 6 guided fix flows drawn only from the business's own help content (`business.ts`: 18 entries); Free tier is 50 conversations/mo at $0. Why it lands: it names the exact daily interruption without made-up stats, and the free tier is zero-risk — the same "free, volume-gated" pattern that is table stakes across competitors (Tidio 50 free convos, Crisp free workspace — pricing scan, 2026-09-18).

**Angle 2 — "It would rather say 'I don't know' than guess."**
Grounded, verbatim from the demo: *"I don't have that in the Cadence help content I can see, and I'd rather not guess"* — then it offers a human ticket. Why it lands: liability-averse buyers' #1 objection to AI is hallucination, and vets live in a profession where a wrong answer about a patient has real consequences. Showing the refusal behavior in one click is disarming and rare. Incumbent per-resolution AI (Intercom Fin $0.99/resolution — pricing scan) prices answers but doesn't demo restraint.

**Angle 3 — "When it can't fix it, it files a ticket with a reference number — or books your 30-minute call."**
Grounded: every guided flow ends in a real escalation — a filed ticket with a reference number visible in the transcript — or lead capture that offers weekday call slots (10:00 / 13:30 / 15:30 / 16:30 ET, 30 min, confirmed by a human). Why it lands: this is after-hours and lunch-rush coverage, not a gimmick — the owner wakes to structured tickets instead of voicemail; and flat tiers (Growth $79 = 1,000 convos/mo) read as predictable cost, which the pricing scan identified as the right shape for low, lumpy clinic volume.

Rule of engagement for all three: send from the owner's real account, personalize one specific thing about the clinic, link the demo, say in one line what Frontdesk AI is, offer an easy out.

## 4. Demo-site conversion notes (for the lead/engineer to implement)

Current state from `routes/index.tsx` (read 2026-09-19): the page speaks as "Cadence" to visitors, the only "this is a demo" signal is a tiny top banner linking /setup · /operator · /install, and the honesty note sits at the bottom of the support section.

1. **Address the buyer directly, above the fold.** Add one strip under the hero: "Own or manage a clinic? Ask the widget the 12 questions your front desk answers daily — then put it on your site with one script tag → /install." Biggest lever: today nothing on the page tells a clinic owner the demo is *for them*.
2. **Surface the honesty hook.** Promote the "it is not allowed to invent pricing, policy or a fix" box next to the support CTA and add one chip that triggers the refusal (e.g. "Do you board reptiles?") so the visitor *sees* "I'd rather not guess" — the most differentiating behavior (Angle 2) is currently buried.
3. **Show the handoff, not just the chat.** Add a small illustrative artifact beside the support section: a reference-numbered ticket card and an offered call slot ("Ticket filed · slot offered Tue 10:00 ET"). Owners buy the after-hours coverage; make it visible without opening the widget.
4. **First-visit widget nudge.** On mobile the bubble is easy to miss; show a one-time (sessionStorage-gated) "Ask me anything" label after ~8 seconds with one suggestion chip. No fake urgency, no auto-open loops.
5. **Instrument the funnel before sending traffic.** Log which suggestion chips get clicked (and /r?ref= source params) so the /operator view can attribute conversations to outreach; without this, week-2 checklist metrics ("did the community post work?") are unanswerable. Needs a small engineer task — flag it now.

## 5. Owner's 2-week checklist (start today; metrics that matter)

**Days 1–2 — Baseline + list.** Record current /operator counts (conversations, signups) as the baseline. Build a 30-clinic list from Maps/Yelp/VMA finders using the §1 qualification (no widget, phone-first, review complaints). *Metrics: baseline recorded; 30 qualified rows.*
**Days 1–3 — Join 3 venues as a human.** Two Reddit subs or FB groups + one manager venue (VHMA if reachable). Read rules, post nothing promotional. *Metric: 3 memberships, rules noted.*
**Days 2–4 — Ship §4 tweaks.** Buyer strip, honesty chip, ticket card, nudge, chip instrumentation. *Metric: tweaks live on the working site and published.*
**Days 3–7 — First 10 personal sends.** Owner's own email/LinkedIn, one-to-one, Angle 1 or 3, demo link, one-line disclosure, easy opt-out. *Metrics: 10 sent; replies ≥ 2; ≥ 5 widget conversations from non-team visitors.*
**Day 5–7 — First value-first community post.** Answer a real front-desk-workload question; mention the demo once, disclose affiliation. *Metric: post live; ref-tagged conversations ≥ 3.*
**Days 8–10 — Follow up once + next 10 sends.** One polite bump to non-responders (no pressure language); 10 more list rows. *Metrics: 20 total sent; ≥ 8 conversations; ≥ 2 signups.*
**Days 9–12 — Partner outreach.** 5 vet software vendors + 3 answering services, honest partnership email (§2). *Metrics: 8 sent; ≥ 1 call booked via the widget's own slot flow (eat your own dog food).*
**Days 10–14 — One in-person touch.** A state VMA chapter evening or local CE event; demo on phone. *Metric: ≥ 5 demo conversations handed to a human follow-up.*
**Day 14 — Review and prune.** Kill any channel with zero conversations after real effort; double the best one.

**Success bar for the fortnight (observable, not vanity):** ≥ 20 non-team widget conversations, ≥ 5 signups, ≥ 1 Stripe payment (Starter $29). If sends are 20+ but conversations are 0, the problem is the landing/message — fix §4 before adding channels. Signups without conversations = KB-setup friction (pair with the onboarding track).
