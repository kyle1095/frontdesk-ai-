/**
 * The conversation engine.
 *
 * One entry point — `handleTurn` — takes an incoming customer message, decides
 * the intent (faq | lead | ticket | troubleshooting | smalltalk | unknown) and
 * drives the matching flow, persisting the conversation, messages, leads and
 * tickets through `store.ts`.
 *
 * Design notes:
 *  - `runFlow` is synchronous and pure: it turns (state, message) into
 *    (new state, agent replies, side effects). `handleTurn` then executes the
 *    side effects against the database. That split keeps the whole conversation
 *    logic testable without a database (see scripts/kb-check.ts).
 *  - Answers come only from the seeded knowledge base. When retrieval is not
 *    confident the engine says so and offers a human handoff (a ticket) — it
 *    never improvises pricing, policy or a fix.
 *  - Conversation state is persisted server-side when a database is configured,
 *    and is also round-tripped through the client so the widget keeps working
 *    when it is not. Nothing is faked: if a ticket cannot be stored, the
 *    customer is told plainly and no reference number is produced.
 */

import {
  business,
  getKbEntry,
  helpDesk,
  upcomingSalesSlots,
  type KbEntry,
  type SalesSlot,
} from "~/content/business";
import { llm, type LlmLayer } from "./llm";
import { retrieve, sampleQuestions, scoreKnowledge } from "./retrieval";
import * as store from "./store";

export type WidgetAction =
  | "send"
  | "ask"
  | "start_lead"
  | "start_ticket"
  | "retry_ticket"
  | "retry_lead"
  | "restart";

export type FlowKind = "idle" | "lead" | "ticket" | "troubleshooting" | "handoff";

export interface Chip {
  label: string;
  action?: WidgetAction;
}

export interface AgentReply {
  text: string;
  chips?: Chip[];
  slots?: SalesSlot[];
  variant?: "info" | "success" | "warning";
}

export interface LeadState {
  step: "name" | "email" | "company" | "need" | "slot" | "file";
  name?: string;
  email?: string;
  company?: string;
  need?: string;
  offered?: SalesSlot[];
  chosen?: SalesSlot;
  saved?: boolean;
}

export interface TicketState {
  step: "whatDoing" | "whatHappened" | "urgency" | "file";
  subject?: string;
  kbId?: string;
  whatDoing?: string;
  whatHappened?: string;
  urgency?: string;
  filed?: boolean;
  reference?: string;
}

export interface ConversationState {
  flow: FlowKind;
  lead?: LeadState;
  ticket?: TicketState;
  troubleshooting?: { kbId: string; startedWith: string };
  handoff?: { question: string };
  turns: number;
}

export interface StorageInfo {
  configured: boolean;
  ok: boolean;
  error?: string;
}

export interface TurnResult {
  conversationId: string | null;
  state: ConversationState;
  replies: AgentReply[];
  storage: StorageInfo;
}

export interface TurnInput {
  businessId?: string;
  conversationId?: string | null;
  message?: string;
  action?: WidgetAction;
  state?: unknown;
}

type Effect =
  | { kind: "save_lead"; draft: Required<Pick<LeadState, "name" | "email" | "company" | "need">> & { slot?: SalesSlot } }
  | { kind: "file_ticket"; draft: { subject: string; whatDoing: string; whatHappened: string; urgency: string } };

interface FlowResult {
  state: ConversationState;
  replies: AgentReply[];
  effects: Effect[];
}

/* ------------------------------------------------------------------ */
/* State helpers                                                       */
/* ------------------------------------------------------------------ */

export function initialState(): ConversationState {
  return { flow: "idle", turns: 0 };
}

const FLOWS: FlowKind[] = ["idle", "lead", "ticket", "troubleshooting", "handoff"];

function normaliseState(raw: unknown): ConversationState {
  if (typeof raw === "string") {
    try {
      return normaliseState(JSON.parse(raw));
    } catch {
      return initialState();
    }
  }
  if (!raw || typeof raw !== "object") return initialState();
  const obj = raw as Partial<ConversationState>;
  const flow = FLOWS.includes(obj.flow as FlowKind) ? (obj.flow as FlowKind) : "idle";
  return {
    flow,
    lead: obj.lead && typeof obj.lead === "object" ? (obj.lead as LeadState) : undefined,
    ticket: obj.ticket && typeof obj.ticket === "object" ? (obj.ticket as TicketState) : undefined,
    troubleshooting:
      obj.troubleshooting && typeof obj.troubleshooting === "object"
        ? (obj.troubleshooting as ConversationState["troubleshooting"])
        : undefined,
    handoff:
      obj.handoff && typeof obj.handoff === "object" ? (obj.handoff as ConversationState["handoff"]) : undefined,
    turns: typeof obj.turns === "number" && Number.isFinite(obj.turns) ? obj.turns : 0,
  };
}

const QUICK_CHIPS: Chip[] = helpDesk.quickActions.map((a) => ({ label: a.label, action: a.action as WidgetAction }));

const ASK_CHIP: Chip = { label: "Ask a question", action: "ask" };
const TICKET_CHIP: Chip = { label: "Report a problem", action: "start_ticket" };
const DEMO_CHIP: Chip = { label: "Book a demo", action: "start_lead" };

/* ------------------------------------------------------------------ */
/* Intent helpers                                                      */
/* ------------------------------------------------------------------ */

const RE_CANCEL = /^(cancel|stop|start over|restart|reset|main menu|menu|never ?mind|forget it)\b/i;
const RE_YES = /^(y|ye|yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|confirm|that'?s right|correct)\b/i;
const RE_NO = /^(n|no|nope|nah|not really|no thanks|nothing else)\b/i;
const RE_THANKS = /\b(thanks|thank you|cheers|appreciate it|perfect|great, thanks)\b/i;
const RE_GREETING = /^(hi|hey|hello|yo|howdy|good (morning|afternoon|evening))\b/i;
const RE_CAPABILITY =
  /\b(who are you|what are you|are you (a )?(bot|robot|human|real)|what can you (do|help)|what do you do|how (does this|do you) work)\b/i;

const RE_LEAD =
  /(\bbook\b[^.]{0,24}\b(demo|call|meeting|walkthrough|slot|session)\b)|(\b(demo|walkthrough)\b)|(\b(talk|speak|chat)\b[^.]{0,20}\b(sales|pricing|buying|purchasing|a plan)\b)|(\b(get|want|need|would like|interested in)\b[^.]{0,30}\b(quote|proposal|pricing for|demo|to buy|to purchase)\b)|(\b(sign ?up|subscribe|purchase|buy)\b[^.]{0,20}\b(cadence|plan|now)\b)|(\bcontact sales\b)/i;

const RE_TICKET =
  /(\b(file|raise|open|create|log|submit|make)\b[^.]{0,24}\b(ticket|case|report|complaint)\b)|(\b(talk|speak|chat|contact)\b[^.]{0,24}\b(human|person|agent|someone|representative|support team|real person|live agent)\b)|(\bescalate\b)|(\breal person\b)|(\bescalation\b)/i;

/** Used to decide whether an in-flow message is really a fresh question rather than
 * an answer to the slot we are filling. */
const RE_QUESTION =
  /^\s*(what|how|why|when|where|who|which|does|do|is|are|can|could|should|will|would|any|tell me)\b|\?\s*$/i;

const RE_RESOLVED = /\b(worked|fixed|that did it|solved|resolved|sorted|good now|all good|yep that)\b/i;
const RE_UNRESOLVED =
  /\b(still|didn'?t work|doesn'?t work|dont work|not working|same (issue|problem|thing)|no luck|nothing (changed|happened)|nope)\b/i;

function parseUrgency(text: string): string | null {
  const s = text.toLowerCase();
  if (/\b(urgent|critical|p1|emergency|asap|immediately)\b/.test(s)) return "Urgent";
  if (/\b(high|severe|serious|major|can'?t (see|book|take) patients|clinic is down)\b/.test(s)) return "High";
  if (/\b(medium|moderate|normal|moderately)\b/.test(s)) return "Medium";
  if (/\b(low|minor|small|cosmetic|not urgent)\b/.test(s)) return "Low";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function normaliseForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9:]+/g, "");
}

function matchSlot(text: string, slots: SalesSlot[]): SalesSlot | null {
  const s = text.trim();
  const byId = slots.find((slot) => slot.id === s.toLowerCase());
  if (byId) return byId;
  const n = Number(s.replace(/[^0-9]/g, ""));
  if (/^\s*[1-9]\s*[).:]?\s*$/.test(s) && n >= 1 && n <= slots.length) return slots[n - 1];
  const cmp = normaliseForCompare(s);
  if (cmp.length >= 4) {
    const byLabel = slots.find((slot) => normaliseForCompare(slot.label).includes(cmp));
    if (byLabel) return byLabel;
  }
  const time = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time) {
    const token = `${time[1].padStart(2, "0")}:${time[2]}`;
    const byTime = slots.find((slot) => slot.label.includes(token));
    if (byTime) return byTime;
  }
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].find((d) =>
    s.toLowerCase().includes(d),
  );
  if (weekday) {
    const byDay = slots.find((slot) => slot.label.toLowerCase().startsWith(weekday.slice(0, 3)));
    if (byDay) return byDay;
  }
  return null;
}

function stepList(entry: KbEntry): string {
  if (!entry.steps?.length) return "";
  return entry.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

function troubleshootingText(entry: KbEntry): string {
  const parts = [entry.answer];
  const steps = stepList(entry);
  if (steps) parts.push(steps);
  if (entry.escalate) parts.push(entry.escalate);
  parts.push("Did that fix it?");
  return parts.join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Flow: idle → classify                                               */
/* ------------------------------------------------------------------ */

function startLead(state: ConversationState, need?: string): FlowResult {
  state.flow = "lead";
  state.ticket = undefined;
  state.troubleshooting = undefined;
  state.handoff = undefined;
  state.lead = { step: "name", need: need || undefined };
  const replies: AgentReply[] = [
    {
      text: need
        ? `Happy to set that up. I'll take a few details and offer you some times.\n\nFirst: what's your name?`
        : "Happy to arrange a demo with a Cadence specialist. It's 30 minutes on a weekday, and they'll walk through booking, reminders and calendar sync using your own clinic's setup.\n\nWhat's your name?",
      chips: [{ label: "Cancel", action: "restart" }],
    },
  ];
  return { state, replies, effects: [] };
}

function startTicket(state: ConversationState, prefill?: { subject?: string; kbId?: string; whatDoing?: string }): FlowResult {
  state.flow = "ticket";
  state.lead = undefined;
  state.troubleshooting = undefined;
  state.handoff = undefined;
  state.ticket = {
    step: prefill?.whatDoing ? "whatHappened" : "whatDoing",
    subject: prefill?.subject,
    kbId: prefill?.kbId,
    whatDoing: prefill?.whatDoing,
  };
  const replies: AgentReply[] = [];
  if (prefill?.whatDoing) {
    replies.push({
      text: `Thanks — I'll pass this to the support team. I have a short triage so they get what they need.\n\nWhat happened, in your words? Include any error message you saw.`,
      chips: [{ label: "Cancel", action: "restart" }],
    });
  } else {
    replies.push({
      text: "I'll file this with the Cadence support team and give you a reference number. Three quick questions.\n\nFirst: what were you doing when the problem happened? (for example: booking an appointment, importing patients, changing reminders)",
      chips: [{ label: "Cancel", action: "restart" }],
    });
  }
  return { state, replies, effects: [] };
}

function resetToIdle(state: ConversationState, leadIn?: string): FlowResult {
  const replies: AgentReply[] = [
    {
      text: leadIn
        ? `${leadIn}\n\nWhat would you like to do?`
        : "No problem, I've put that aside. What would you like to do?",
      chips: QUICK_CHIPS,
    },
  ];
  return { state: { flow: "idle", turns: state.turns }, replies, effects: [] };
}

function answerFaq(state: ConversationState, entry: KbEntry): FlowResult {
  const replies: AgentReply[] = [{ text: entry.answer }];
  const chips: Chip[] = [];
  if (entry.category === "pricing" || entry.category === "trial" || entry.category === "sales") {
    replies.push({
      text: "If it helps, I can book you a 30 minute walkthrough with a Cadence specialist.",
    });
    chips.push(DEMO_CHIP);
  }
  chips.push(ASK_CHIP, TICKET_CHIP);
  replies[replies.length - 1].chips = chips;
  state.flow = "idle";
  return { state, replies, effects: [] };
}

function startTroubleshooting(state: ConversationState, entry: KbEntry, startedWith: string): FlowResult {
  state.flow = "troubleshooting";
  state.troubleshooting = { kbId: entry.id, startedWith };
  return {
    state,
    replies: [
      {
        text: troubleshootingText(entry),
        chips: [
          { label: "That fixed it", action: "send" },
          { label: "Still not working", action: "send" },
        ],
      },
    ],
    effects: [],
  };
}

function unknownHandoff(state: ConversationState, question: string): FlowResult {
  state.flow = "handoff";
  state.handoff = { question };
  return {
    state,
    replies: [
      { text: helpDesk.unknownFallback },
      {
        text: "Shall I file that for you?",
        chips: [
          { label: "Yes, file a ticket", action: "start_ticket" },
          { label: "No thanks", action: "restart" },
        ],
      },
    ],
    effects: [],
  };
}

function capabilityReply(state: ConversationState): FlowResult {
  state.flow = "idle";
  return {
    state,
    replies: [
      {
        text: `I'm the ${business.name} assistant, running on Frontdesk AI. I can:\n• answer questions about ${business.name} — what it does, plans, the free trial, integrations, setup, security;\n• walk you through fixes for common problems;\n• book you a 30 minute demo with a specialist;\n• file a ticket with a reference number if you need a human.\n\nI only answer from ${business.name}'s own help content, so if something isn't in there I'll say so rather than guess.`,
        chips: QUICK_CHIPS,
      },
    ],
    effects: [],
  };
}

/* ------------------------------------------------------------------ */
/* Flow: lead                                                          */
/* ------------------------------------------------------------------ */

function continueLead(state: ConversationState, text: string): FlowResult {
  const lead = state.lead ?? { step: "name" as const };
  state.lead = lead;
  const replies: AgentReply[] = [];
  const effects: Effect[] = [];

  if (lead.step === "email") {
    if (!EMAIL_RE.test(text.trim())) {
      replies.push({
        text: `That doesn't look like a working email address — I use it only to send the confirmation. Could you retype it? (for example: sam@yourclinic.com)`,
      });
      return { state, replies, effects };
    }
    lead.email = text.trim();
    lead.step = "company";
    replies.push({ text: "Thanks. What's the name of your clinic or company?" });
    return { state, replies, effects };
  }

  if (lead.step === "slot") {
    const slots = lead.offered?.length ? lead.offered : upcomingSalesSlots(4);
    lead.offered = slots;
    const chosen = matchSlot(text, slots);
    if (!chosen) {
      replies.push({
        text: "I didn't catch which of those times you meant. You can reply with the time, for example \"10:00\", or tap one of the options.",
        chips: slots.map((s) => ({ label: s.label, action: "send" as WidgetAction })),
      });
      return { state, replies, effects };
    }
    lead.chosen = chosen;
    lead.step = "file";
    effects.push({
      kind: "save_lead",
      draft: {
        name: lead.name ?? "",
        email: lead.email ?? "",
        company: lead.company ?? "",
        need: lead.need ?? "",
        slot: chosen,
      },
    });
    return { state, replies, effects };
  }

  // Free-text steps: an unrelated but confident question gets answered, then we
  // return to the question we were on.
  const step = lead.step;
  const questionFor: Record<string, string> = {
    name: "what's your name?",
    company: "what's the name of your clinic or company?",
    need: "what do you need help with?",
  };
  if (step === "name" || step === "company" || step === "need") {
    const [best] = scoreKnowledge(text);
    if (RE_QUESTION.test(text) && best?.confident && best.score >= 3) {
      replies.push({ text: best.entry.kind === "troubleshooting" ? troubleshootingText(best.entry) : best.entry.answer });
      replies.push({
        text: `Back to the demo request — ${questionFor[step]}`,
        chips: [{ label: "Cancel", action: "restart" }],
      });
      return { state, replies, effects };
    }
  }

  if (step === "name") {
    const name = text.replace(/^(my name is|i'?m|this is|it'?s)\s+/i, "").trim();
    if (name.length < 2) {
      replies.push({ text: "I'll need a name to pass on — what should the specialist call you?" });
      return { state, replies, effects };
    }
    lead.name = name;
    lead.step = "email";
    replies.push({ text: `Thanks, ${lead.name}. What's the best work email for you?` });
    return { state, replies, effects };
  }

  if (step === "company") {
    lead.company = text.trim();
    lead.step = "need";
    replies.push({ text: "Got it. What do you need from Cadence? One or two lines is plenty." });
    return { state, replies, effects };
  }

  if (step === "need") {
    lead.need = text.trim();
    lead.step = "slot";
    const slots = upcomingSalesSlots(4);
    lead.offered = slots;
    replies.push({
      text: "Thanks — that's everything I need. Here are the next available 30 minute demo slots. Which works best?",
      chips: slots.map((s) => ({ label: s.label, action: "send" as WidgetAction })),
    });
    return { state, replies, effects };
  }

  // step "file": the previous save attempt failed; retry it.
  effects.push({
    kind: "save_lead",
    draft: {
      name: lead.name ?? "",
      email: lead.email ?? "",
      company: lead.company ?? "",
      need: lead.need ?? "",
      slot: lead.chosen,
    },
  });
  return { state, replies, effects };
}

/* ------------------------------------------------------------------ */
/* Flow: ticket                                                        */
/* ------------------------------------------------------------------ */

function continueTicket(state: ConversationState, text: string): FlowResult {
  const ticket = state.ticket ?? { step: "whatDoing" as const };
  state.ticket = ticket;
  const replies: AgentReply[] = [];
  const effects: Effect[] = [];

  if (ticket.step === "urgency") {
    const urgency = parseUrgency(text);
    if (!urgency) {
      replies.push({
        text: "How urgent is this for you?",
        chips: ["Low", "Medium", "High", "Urgent"].map((u) => ({ label: u, action: "send" as WidgetAction })),
      });
      return { state, replies, effects };
    }
    ticket.urgency = urgency;
    ticket.step = "file";
  } else if (ticket.step === "whatDoing") {
    const [best] = scoreKnowledge(text);
    if (RE_QUESTION.test(text) && best?.confident && best.score >= 3 && best.entry.kind === "faq") {
      replies.push({ text: best.entry.answer });
      replies.push({ text: "Back to your ticket — what were you doing when the problem happened?" });
      return { state, replies, effects };
    }
    ticket.whatDoing = text;
    ticket.step = "whatHappened";
    if (!ticket.subject) ticket.subject = text.slice(0, 120);
    replies.push({
      text: "Thanks. What happened, in your words? Include any error message you saw.",
    });
    return { state, replies, effects };
  } else if (ticket.step === "whatHappened") {
    ticket.whatHappened = text;
    ticket.step = "urgency";
    replies.push({
      text: "And how urgent is this?",
      chips: ["Low", "Medium", "High", "Urgent"].map((u) => ({ label: u, action: "send" as WidgetAction })),
    });
    return { state, replies, effects };
  }

  if (ticket.step === "file") {
    const kb = ticket.kbId ? getKbEntry(ticket.kbId) : undefined;
    effects.push({
      kind: "file_ticket",
      draft: {
        subject: kb?.title ?? ticket.subject ?? (ticket.whatDoing ?? "Support request").slice(0, 120),
        whatDoing: ticket.whatDoing ?? "(not provided)",
        whatHappened: ticket.whatHappened ?? "(not provided)",
        urgency: ticket.urgency ?? "Medium",
      },
    });
  }
  return { state, replies, effects };
}

/* ------------------------------------------------------------------ */
/* Flow: troubleshooting                                               */
/* ------------------------------------------------------------------ */

function continueTroubleshooting(state: ConversationState, text: string, action?: WidgetAction): FlowResult {
  const entry = state.troubleshooting ? getKbEntry(state.troubleshooting.kbId) : undefined;
  const replies: AgentReply[] = [];
  const effects: Effect[] = [];

  if (!entry) return resetToIdle(state);

  const sub = text.trim();
  if (action === "start_ticket" || RE_TICKET.test(sub)) {
    return startTicket(state, {
      subject: entry.title,
      kbId: entry.id,
      whatDoing: state.troubleshooting?.startedWith ?? entry.question,
    });
  }

  if (RE_UNRESOLVED.test(sub) || (RE_NO.test(sub) && !RE_RESOLVED.test(sub))) {
    replies.push({
      text: `Sorry that didn't sort it. I'll stop guessing and get a human on it — the support team can look at your account's logs for the "${entry.title.toLowerCase()}" problem.`,
    });
    const started = startTicket(state, {
      subject: entry.title,
      kbId: entry.id,
      whatDoing: state.troubleshooting?.startedWith ?? entry.question,
    });
    started.replies.unshift(...replies);
    return started;
  }

  if (RE_RESOLVED.test(sub) || RE_YES.test(sub)) {
    state.flow = "idle";
    state.troubleshooting = undefined;
    return {
      state,
      replies: [
        {
          text: "Great — glad that sorted it. Anything else I can help with?",
          chips: QUICK_CHIPS,
        },
      ],
      effects: [],
    };
  }

  // Something else asked mid-flow: answer it if we can, then check back in.
  const [best] = scoreKnowledge(sub);
  if (best?.confident) {
    return {
      state,
      replies: [
        { text: best.entry.kind === "troubleshooting" ? troubleshootingText(best.entry) : best.entry.answer },
        { text: `Back to your original problem — did those steps for "${entry.title.toLowerCase()}" fix it?` },
      ],
      effects: [],
    };
  }

  replies.push({
    text: `Did the steps fix it? If not, say "still not working" and I'll file a ticket with the support team.`,
    chips: [
      { label: "That fixed it", action: "send" },
      { label: "Still not working", action: "send" },
    ],
  });
  return { state, replies, effects };
}

/* ------------------------------------------------------------------ */
/* Flow: handoff (we could not answer, ticket offered)                 */
/* ------------------------------------------------------------------ */

function continueHandoff(state: ConversationState, text: string): FlowResult {
  const question = state.handoff?.question ?? text;
  const replies: AgentReply[] = [];

  if (RE_YES.test(text.trim())) {
    return startTicket(state, { subject: question.slice(0, 120), whatDoing: question });
  }
  if (RE_NO.test(text.trim())) {
    return resetToIdle(state, "Understood — I won't file anything.");
  }

  const [best] = scoreKnowledge(text);
  if (best?.confident) {
    state.flow = "idle";
    state.handoff = undefined;
    return {
      state,
      replies: [
        { text: best.entry.kind === "troubleshooting" ? troubleshootingText(best.entry) : best.entry.answer },
        {
          text: "That's what I have on that. I still can't answer your earlier question from the help content — shall I file it for the support team?",
          chips: [
            { label: "Yes, file a ticket", action: "start_ticket" },
            { label: "No thanks", action: "restart" },
          ],
        },
      ],
      effects: [],
    };
  }

  replies.push({
    text: "I'm still not able to answer that from Cadence's help content. Shall I file it as a ticket so a human picks it up?",
    chips: [
      { label: "Yes, file a ticket", action: "start_ticket" },
      { label: "No thanks", action: "restart" },
    ],
  });
  return { state, replies, effects: [] };
}

/* ------------------------------------------------------------------ */
/* runFlow — synchronous conversation logic                            */
/* ------------------------------------------------------------------ */

export function runFlow(input: { state: ConversationState; message: string; action?: WidgetAction }): FlowResult {
  const state = normaliseState(input.state);
  const action = input.action ?? "send";
  const text = (input.message ?? "").trim();
  state.turns += 1;

  const replies: AgentReply[] = [];
  const effects: Effect[] = [];

  /* --- explicit widget actions (chips / buttons) --- */
  if (action === "restart") return resetToIdle(state);
  if (action === "ask") {
    state.flow = "idle";
    return {
      state,
      replies: [
        {
          text: "Sure — ask me anything about Cadence. These come up a lot:",
          chips: sampleQuestions(5).map((q) => ({ label: q, action: "send" as WidgetAction })),
        },
      ],
      effects: [],
    };
  }
  if (action === "start_lead") return startLead(state);
  if (action === "start_ticket") {
    const asked = state.handoff?.question ?? state.troubleshooting?.startedWith;
    return startTicket(state, asked ? { subject: asked.slice(0, 120), whatDoing: asked } : undefined);
  }
  if (action === "retry_ticket") {
    if (state.ticket) {
      state.flow = "ticket";
      state.ticket.step = "file";
      return continueTicket(state, "");
    }
    return startTicket(state);
  }
  if (action === "retry_lead") {
    if (state.lead) {
      state.flow = "lead";
      state.lead.step = "file";
      return continueLead(state, "");
    }
    return startLead(state);
  }

  if (!text) {
    replies.push({ text: "I didn't get a message — could you type that again?", chips: QUICK_CHIPS });
    return { state, replies, effects };
  }

  /* --- explicit reset --- */
  if (RE_CANCEL.test(text)) {
    return resetToIdle(state, "No problem, I've put that aside.");
  }

  /* --- continue an in-flight flow --- */
  if (state.flow === "lead") return continueLead(state, text);
  if (state.flow === "ticket") return continueTicket(state, text);
  if (state.flow === "troubleshooting") return continueTroubleshooting(state, text, action);
  if (state.flow === "handoff") return continueHandoff(state, text);

  /* --- idle: classify --- */
  if (RE_LEAD.test(text)) {
    // Only carry the opener into "what they need" when it actually says something
    // beyond "book a demo" — otherwise it just pollutes the lead record.
    const words = text.trim().split(/\s+/).length;
    return startLead(state, words > 4 ? text : undefined);
  }
  if (RE_TICKET.test(text)) return startTicket(state, { subject: text.slice(0, 120), whatDoing: text });

  const best = retrieve(text);
  if (best) {
    if (best.entry.kind === "troubleshooting") return startTroubleshooting(state, best.entry, text);
    return answerFaq(state, best.entry);
  }

  if (RE_CAPABILITY.test(text)) return capabilityReply(state);
  if (RE_GREETING.test(text)) {
    state.flow = "idle";
    return {
      state,
      replies: [
        {
          text: `${helpDesk.greeting}`,
          chips: [...QUICK_CHIPS, ...sampleQuestions(3).map((q) => ({ label: q, action: "send" as WidgetAction }))],
        },
      ],
      effects: [],
    };
  }
  if (RE_THANKS.test(text)) {
    state.flow = "idle";
    return {
      state,
      replies: [{ text: "Any time. Anything else I can help with?", chips: QUICK_CHIPS }],
      effects: [],
    };
  }

  return unknownHandoff(state, text);
}

/* ------------------------------------------------------------------ */
/* handleTurn — flow + persistence                                     */
/* ------------------------------------------------------------------ */

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function handleTurn(input: TurnInput, llmLayer: LlmLayer = llm): Promise<TurnResult> {
  const businessId = input.businessId || business.id;
  const message = (input.message ?? "").trim();
  const action = input.action ?? "send";

  let conversationId = input.conversationId ?? null;
  let state = normaliseState(input.state);
  let storageError: string | undefined;
  let storageOk = false;

  /* Load authoritative state from the database when we can. */
  if (conversationId) {
    try {
      const loaded = await store.loadConversationState(conversationId);
      if (loaded) {
        state = normaliseState(loaded.state);
        storageOk = true;
      } else {
        conversationId = null;
      }
    } catch (err) {
      storageError = errText(err);
    }
  }
  if (!conversationId) {
    try {
      conversationId = await store.createConversation(businessId, state);
      storageOk = true;
    } catch (err) {
      storageError = errText(err);
      conversationId = null;
    }
  }

  if (message) {
    try {
      await store.appendMessage(conversationId, "user", message, { action });
      storageOk = true;
    } catch (err) {
      storageError = errText(err);
      storageOk = false;
    }
  }

  /* --- conversation logic --- */
  let result = runFlow({ state, message, action });

  /* Optional LLM assist: only when retrieval was NOT confident, let the model
     pick among the top candidates. Guarded — it can only return a KB entry. */
  if (llmLayer.enabled && state.flow === "idle" && message && result.state.flow === "handoff") {
    try {
      // Only let an optional LLM choose among matches that already meet the
      // deterministic confidence bar. A weak lexical overlap (for example
      // "quantum encryption" sharing only "encryption" with the security FAQ)
      // must remain a human handoff, never an invitation for the model to guess.
      const candidates = scoreKnowledge(message)
        .filter((m) => m.confident)
        .slice(0, 4)
        .map((m) => ({ id: m.entry.id, title: m.entry.title, question: m.entry.question }));
      const picked = await llmLayer.route(message, candidates);
      const entry = picked ? getKbEntry(picked) : undefined;
      if (entry) {
        result =
          entry.kind === "troubleshooting"
            ? startTroubleshooting(normaliseState(state), entry, message)
            : answerFaq(normaliseState(state), entry);
      }
    } catch {
      /* fall through to the deterministic handoff */
    }
  }

  state = result.state;
  const replies = [...result.replies];

  /* --- side effects --- */
  for (const effect of result.effects) {
    if (effect.kind === "save_lead") {
      const res = await store.createLead({
        businessId,
        conversationId,
        name: effect.draft.name,
        email: effect.draft.email,
        company: effect.draft.company,
        need: effect.draft.need,
        slotLabel: effect.draft.slot?.label ?? null,
        slotStartsAt: effect.draft.slot?.startsAt ?? null,
      });
      if (res.ok) {
        storageOk = true;
        state.lead = { ...(state.lead ?? { step: "file" }), saved: true, step: "file" };
        state.flow = "idle";
        replies.push({
          text: `All set. Here's what I logged:\n\n• ${effect.draft.name} — ${effect.draft.email}\n• ${effect.draft.company}\n• ${effect.draft.need}\n• Demo slot requested: ${effect.draft.slot?.label ?? "to be confirmed"}\n\nThat request is saved for the Cadence team and they will confirm the slot. Anything else I can help with?`,
          variant: "success",
          chips: [ASK_CHIP, TICKET_CHIP],
        });
      } else {
        storageError = res.error ?? storageError;
        storageOk = false;
        replies.push({
          text: `I couldn't save that request — the help desk can't reach the Cadence CRM right now, so I don't want to tell you it's booked when it isn't. Your details are still here:\n\n• ${effect.draft.name} — ${effect.draft.email}\n• ${effect.draft.company}\n• ${effect.draft.need}\n• Slot you picked: ${effect.draft.slot?.label ?? "n/a"}`,
          variant: "warning",
        });
        replies.push({
          text: "Please try again in a moment — I'll keep your answers.",
          chips: [{ label: "Try saving again", action: "retry_lead" }, ASK_CHIP],
        });
      }
    }

    if (effect.kind === "file_ticket") {
      const res = await store.createTicket({
        businessId,
        conversationId,
        subject: effect.draft.subject,
        whatDoing: effect.draft.whatDoing,
        whatHappened: effect.draft.whatHappened,
        urgency: effect.draft.urgency,
      });
      if (res.ok && res.reference) {
        storageOk = true;
        state.ticket = {
          ...(state.ticket ?? { step: "file" }),
          filed: true,
          reference: res.reference,
          step: "file",
          subject: effect.draft.subject,
          whatDoing: effect.draft.whatDoing,
          whatHappened: effect.draft.whatHappened,
          urgency: effect.draft.urgency,
        };
        state.flow = "idle";
        replies.push({
          text: `Your ticket is filed. Reference: ${res.reference}\n\n• Problem: ${effect.draft.subject}\n• Urgency: ${effect.draft.urgency}\n• Status: open\n\nQuote ${res.reference} if you follow up. ${business.name} support is ${business.supportHours.toLowerCase()}`,
          variant: "success",
          chips: [ASK_CHIP, DEMO_CHIP],
        });
      } else {
        storageError = res.error ?? storageError;
        storageOk = false;
        replies.push({
          text: `I couldn't file that ticket. The help desk can't reach the ticket database right now, so I won't give you a reference number that wouldn't work.\n\nHere's what I have, ready to file when it's back:\n\n• Problem: ${effect.draft.subject}\n• What you were doing: ${effect.draft.whatDoing}\n• What happened: ${effect.draft.whatHappened}\n• Urgency: ${effect.draft.urgency}`,
          variant: "warning",
        });
        replies.push({
          text: "Sorry about that — nothing you typed was lost. Try again in a moment:",
          chips: [{ label: "Try filing again", action: "retry_ticket" }, ASK_CHIP],
        });
      }
    }
  }

  /* --- persist state + agent replies --- */
  // If the initial conversation write failed, there is no row to update. Avoid
  // making every otherwise-usable FAQ reply pay for a second doomed query.
  if (conversationId) {
    try {
      await store.saveConversationState(conversationId, state);
      storageOk = true;
    } catch (err) {
      if (!storageError) storageError = errText(err);
      storageOk = false;
    }
  }

  for (const reply of replies) {
    try {
      await store.appendMessage(conversationId, "agent", reply.text, {
        chips: reply.chips?.map((c) => c.label),
        variant: reply.variant,
      });
    } catch (err) {
      if (!storageError) storageError = errText(err);
      storageOk = false;
    }
  }

  return {
    conversationId,
    state,
    replies,
    storage: {
      configured: store.databaseConfigured(),
      ok: storageOk,
      error: storageOk ? undefined : storageError ?? "not stored",
    },
  };
}

export function greeting(): AgentReply {
  return {
    text: helpDesk.greeting,
    chips: [...QUICK_CHIPS, ...sampleQuestions(3).map((q) => ({ label: q, action: "send" as WidgetAction }))],
  };
}
