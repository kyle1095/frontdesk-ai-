# Competitor pricing scan — 2026-09-18 (verified live via agent-browser)

All figures read from the vendor pricing pages on 2026-09-18 unless marked otherwise. Snapshot transcripts in /tmp/p-*.txt (session artifacts).

## Verified table

| Vendor | Model | Verified figures (2026-09-18) | Source |
|---|---|---|---|
| Intercom | Per seat + per AI resolution | Seats $29 (Essential) / $99 (Advanced) per seat/mo; **Fin AI $0.99 per resolution** (volume-based); Fin Voice $1.99/voice outcome; worked example: 91 Fin resolutions ≈ $33/mo; 14-day cardless trial, no free tier; startups (<$10M raised, ≤15 ppl) 93% off | intercom.com/pricing |
| Tidio | Free tier + seats + AI conversation packs | Free: 50 billable conversations, 50 Lyro AI conversations (one-time); paid tiers Starter/Growth/Plus with 7-day trials, annual billing = 2 months free; Plus **$300/mo** with from-3,000 Lyro conversations + 50% Lyro resolution guarantee; Lyro quotas sold in 50–1,000 conversation blocks | tidio.com/pricing |
| Crisp | Flat workspace tiers + per-seat add-ons | **$0 / $45 / $95 / $295 per month per workspace**; additional agents $0–$10 (plan-dependent); 14-day trial | crisp.chat/en/pricing |
| Chatbase | Message-credit tiers | Free plan exists; paid tiers priced per 1,000 message credits with auto-recharge; exact tier $ values are JS-rendered and did not appear in the DOM snapshot — model confirmed, exact prices UNVERIFIED (indicative ~$40/$150 from researcher's prior knowledge) | chatbase.co/pricing |
| Botpress | Flat tier + AI usage credit | Free $0; **$40/mo = 250 conversations/mo + $25 AI usage**; $150/mo = 1,500 conversations/mo + $150 AI usage; $750/mo tier visible; overage packs 100 convos at $50 ($0.50/convo) or $65 ($0.65/convo); $10 auto-recharge grants at 95% spend | botpress.com/pricing |
| Smith.ai (contrast) | Human service, conversation bundles | Chat bundles **$300 / $810 / $2,100 per month** (by volume); add-ons: booking $1.50, transcription $0.25, extra transfer destinations $15/mo | smith.ai/pricing |
| ChatBot.com | Flat tiers by chats, per seat | Entry **$19 per user/mo billed yearly** (slider-configured); 14-day trial, no free plan | chatbot.com/pricing |
| WebWhiz | — | **UNREACHABLE** (certificate error) — dropped from comparison | webwhiz.ai/pricing |

## Patterns (verified basis)
- Per-AI-resolution benchmark: Intercom Fin **$0.99/resolution** — the incumbent AI answer price. At 300 resolutions/mo that alone is ~$297/mo on top of $29/seat.
- Entry paid tiers for SMB site chat cluster **$19–45/mo** (ChatBot $19, Crisp $45, Tidio Starter ~$29 from its annual toggle).
- AI-answer-included products cluster **$40–150/mo** (Botpress $40→$150 with hard conversation caps and $0.50–0.65/convo overage).
- Free tiers are near-universal and volume-gated (Tidio 50 convos, Crisp free workspace, Chatbase free credits) — table stakes for self-serve conversion.
- Human-powered chat services (Smith.ai) run **$300+/mo** — the contrast that sells AI-only self-serve at 3–10× less.

## Implication for Frontdesk AI tiers
Flat monthly tiers with included conversation caps beat per-resolution pricing on predictability for the target customer (vet clinics: low, lumpy volume). Gate on conversations/month + KB size + branding; seats are a weak gate for this product.
