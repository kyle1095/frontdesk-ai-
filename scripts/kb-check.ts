/**
 * Offline self-check for the conversation engine. No database, no API key:
 *   bun run scripts/kb-check.ts
 *
 * It prints, for a set of realistic messages, which knowledge-base entry (if any)
 * the retrieval layer picks, how confident it is, and where the flow goes. Use it
 * when editing `src/content/business.ts` or the scoring in `src/server/retrieval.ts`.
 */

import { knowledgeBase } from "../src/content/business";
import { runFlow, initialState, type ConversationState } from "../src/server/engine";
import { scoreKnowledge } from "../src/server/retrieval";

const FAQ_QUESTIONS = [
  "how much does cadence cost",
  "what's the price of the growth plan",
  "is there a free trial",
  "which calendars do you sync with",
  "do you integrate with epic",
  "is cadence hipaa compliant",
  "what are your support hours",
  "how do I set up cadence",
  "who is cadence for",
  "how many staff can I add",
  "can I cancel or change my plan",
  "what is cadence used for",
  "do you have an API",
];

const TROUBLE = [
  "my calendar isn't syncing",
  "google calendar events are missing from cadence",
  "booking an appointment won't save",
  "the save button does nothing when I add a patient",
  "I can't log in, how do I reset my password",
  "my account is locked",
  "appointments are showing the wrong timezone",
  "the times are off by an hour",
  "my patient CSV import failed",
  "reminders aren't being sent to patients",
];

const NOISE = [
  "what's the weather tomorrow",
  "do you offer training in Portuguese for veterinary clinics",
  "can you book me a flight",
  "what is Cadence's policy for quantum encryption",
  "hi",
  "thanks!",
];

function intentOf(message: string): { entry: string; score: number; confident: boolean } {
  const [best] = scoreKnowledge(message);
  return best
    ? { entry: best.entry.id, score: best.score, confident: best.confident }
    : { entry: "(none)", score: 0, confident: false };
}

function flowFor(message: string): { flow: string; firstReply: string } {
  const state: ConversationState = initialState();
  const result = runFlow({ state, message });
  const first = result.replies[0]?.text ?? "(no reply)";
  return { flow: result.state.flow, firstReply: first.split("\n")[0].slice(0, 78) };
}

console.log(`knowledge base: ${knowledgeBase.length} entries`);
console.log("\n== FAQ questions ==");
for (const q of FAQ_QUESTIONS) {
  const i = intentOf(q);
  console.log(`${i.confident ? "OK  " : "MISS"} ${q}\n     -> ${i.entry} (score ${i.score})`);
}

console.log("\n== Troubleshooting ==");
for (const q of TROUBLE) {
  const i = intentOf(q);
  console.log(`${i.confident ? "OK  " : "MISS"} ${q}\n     -> ${i.entry} (score ${i.score})`);
}

console.log("\n== Should NOT match (must fall through to the human handoff) ==");
for (const q of NOISE) {
  const i = intentOf(q);
  const f = flowFor(q);
  console.log(`${i.confident ? "BAD " : "ok  "} ${q}\n     -> match ${i.entry} (score ${i.score}) | flow=${f.flow} | "${f.firstReply}"`);
}

console.log("\n== Flow entry points ==");
for (const q of ["I'd like to book a demo", "I want to talk to sales about pricing for my clinic", "I need to talk to a human", "file a ticket please", "what can you do?"]) {
  const f = flowFor(q);
  console.log(`${q}\n     -> flow=${f.flow} | "${f.firstReply}"`);
}

console.log("\n== Multi-turn: troubleshooting -> ticket -> reference ==");
let state = initialState();
const script = ["my calendar isn't syncing", "Still not working", "I was adding appointments", "nothing appears in google", "High"];
for (const message of script) {
  const result = runFlow({ state, message });
  state = result.state;
  console.log(`user: ${message}\n  flow=${state.flow} step=${state.ticket?.step ?? state.lead?.step ?? "-"} effects=n/a`);
  console.log(`  agent: ${(result.replies[0]?.text ?? "").split("\n")[0].slice(0, 90)}`);
}

console.log("\n== Multi-turn: lead capture to slot ==");
state = initialState();
const leadScript = ["Book a demo", "Sam Rivera", "sam@riverside-clinic.com", "Riverside Clinic", "We want online booking and SMS reminders", "10:00"];
for (const message of leadScript) {
  const result = runFlow({ state, message });
  state = result.state;
  const chips = result.replies.flatMap((r) => r.chips?.map((c) => c.label) ?? []);
  console.log(`user: ${message}\n  flow=${state.flow} step=${state.lead?.step ?? "-"} chips=[${chips.slice(0, 4).join(" | ")}]`);
  console.log(`  agent: ${(result.replies[0]?.text ?? "").split("\n")[0].slice(0, 90)}`);
  if (state.lead?.chosen) console.log(`  chosen slot: ${state.lead.chosen.label}`);
}
