/**
 * Knowledge-base retrieval.
 *
 * Deliberately dumb, deterministic and dependency-free: the demo business's
 * answers must work with no external API key configured. A message is tokenised,
 * normalised through a small synonym map and light stemmer, then scored against
 * every KB entry. We only ever answer when the top entry clears a confidence
 * bar; otherwise the engine says it does not know and offers a human handoff.
 *
 * Scoring model (documented so it can be tuned or replaced by an LLM router):
 *  - key terms (entry title + keywords) carry the signal, weighted by how rare
 *    the term is across the KB (df): rarer terms are far more decisive.
 *  - answer-body terms are weak corroboration only.
 *  - an exact-ish match to the entry's canonical question gives a bonus.
 * Confident match = score >= 1.4 AND (>= 2 key hits OR one rare key hit in a terse message).
 */

import { getKbEntry, knowledgeBase, type KbEntry } from "~/content/business";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "am",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "doing",
  "did",
  "i",
  "im",
  "me",
  "my",
  "mine",
  "we",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "it",
  "its",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "but",
  "with",
  "without",
  "about",
  "from",
  "by",
  "as",
  "that",
  "this",
  "these",
  "those",
  "there",
  "here",
  "have",
  "has",
  "had",
  "having",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "please",
  "thanks",
  "thank",
  "hi",
  "hello",
  "hey",
  "ok",
  "okay",
  "get",
  "got",
  "just",
  "any",
  "some",
  "very",
  "really",
  "also",
  "still",
  "again",
  "now",
  "then",
  "than",
  "howdo",
  "anyone",
  "question",
  "helpful",
]);

/** term -> canonical term(s). Applied to both messages and KB keywords. */
const SYNONYMS: Record<string, string> = {
  price: "pricing",
  priced: "pricing",
  cost: "pricing",
  costs: "pricing",
  fee: "pricing",
  fees: "pricing",
  charge: "pricing",
  charges: "pricing",
  much: "pricing",
  monthly: "pricing",
  subscription: "pricing",
  billed: "pricing",
  billing: "pricing",
  pay: "pricing",
  costed: "pricing",
  plan: "plan",
  plans: "plan",
  tier: "plan",
  tiers: "plan",
  package: "plan",
  sync: "sync",
  syncing: "sync",
  synced: "sync",
  synchronise: "sync",
  synchronize: "sync",
  synchronization: "sync",
  synchronisation: "sync",
  reconnecting: "reconnect",
  reconnected: "reconnect",
  appointment: "appointment",
  appointments: "appointment",
  appt: "appointment",
  appts: "appointment",
  visit: "appointment",
  visits: "appointment",
  booking: "booking",
  bookings: "booking",
  booked: "booking",
  book: "booking",
  login: "login",
  log: "login",
  signin: "login",
  sign: "login",
  signed: "login",
  logged: "login",
  password: "password",
  passwd: "password",
  reset: "password",
  forget: "password",
  forgot: "password",
  locked: "locked",
  lockout: "locked",
  mfa: "sso",
  "2fa": "sso",
  sso: "sso",
  timezone: "timezone",
  tz: "timezone",
  utc: "timezone",
  gmt: "timezone",
  offset: "timezone",
  dst: "timezone",
  daylight: "timezone",
  timezones: "timezone",
  import: "import",
  imports: "import",
  imported: "import",
  importing: "import",
  upload: "import",
  uploaded: "import",
  uploading: "import",
  csv: "csv",
  migrate: "import",
  migration: "import",
  reminder: "reminder",
  reminders: "reminder",
  sms: "sms",
  text: "sms",
  texts: "sms",
  messaged: "sms",
  integration: "integration",
  integrations: "integration",
  integrate: "integration",
  integrates: "integration",
  integrating: "integration",
  connector: "integration",
  connection: "integration",
  connected: "integration",
  connects: "integration",
  hipaa: "security",
  compliant: "security",
  compliance: "security",
  soc: "security",
  baa: "security",
  encryption: "security",
  encrypted: "security",
  gdpr: "security",
  privacy: "security",
  trial: "trial",
  freetrial: "trial",
  free: "trial",
  trying: "trial",
  try: "trial",
  demo: "demo",
  demos: "demo",
  walkthrough: "demo",
  specialist: "demo",
  support: "support",
  human: "support",
  person: "support",
  agent: "support",
  staffed: "support",
  cancel: "cancel",
  cancellation: "cancel",
  cancelling: "cancel",
  refund: "cancel",
  refunds: "cancel",
  downgrade: "cancel",
  upgrade: "cancel",
  terminate: "cancel",
  setup: "setup",
  configure: "setup",
  configured: "setup",
  configuration: "setup",
  installing: "setup",
  install: "setup",
  onboarding: "setup",
  started: "setup",
  staff: "staff",
  seat: "staff",
  seats: "staff",
  user: "staff",
  users: "staff",
  provider: "staff",
  providers: "staff",
  team: "staff",
  members: "staff",
  employees: "staff",
  broken: "broken",
  broke: "broken",
  failing: "broken",
  fails: "failed",
  failure: "failed",
  errors: "error",
  errored: "error",
  issue: "problem",
  issues: "problem",
  bug: "problem",
  problems: "problem",
  trouble: "problem",
  calendar: "calendar",
  calendars: "calendar",
  googlecalendar: "calendar",
  gcal: "calendar",
  outlook: "outlook",
  microsoft: "microsoft",
  ical: "apple",
  applecalendar: "apple",
  patient: "patient",
  patients: "patient",
  client: "patient",
  clients: "patient",
  hours: "hours",
  opened: "hours",
  closed: "hours",
};

function stemVariants(word: string): string[] {
  const out = new Set<string>([word]);
  const add = (w: string) => {
    if (w.length >= 3) out.add(w);
  };
  if (word.endsWith("'s")) add(word.slice(0, -2));
  if (word.endsWith("ies") && word.length > 4) add(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 3) add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) add(word.slice(0, -1));
  if (word.endsWith("ing") && word.length > 5) {
    add(word.slice(0, -3));
    add(`${word.slice(0, -3)}e`);
  }
  if (word.endsWith("ed") && word.length > 4) {
    add(word.slice(0, -2));
    add(word.slice(0, -1));
  }
  if (word.endsWith("ly") && word.length > 4) add(word.slice(0, -2));
  return [...out];
}

/** Raw word tokens (stopwords removed). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]+/g, " ")
    .split(/[\s-]+/)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Stemmed words the customer actually typed — no synonym expansion. */
export function literalTerms(text: string): Set<string> {
  const terms = new Set<string>();
  for (const raw of tokenize(text))
    for (const v of stemVariants(raw)) terms.add(v);
  return terms;
}

/** Canonical term set for a message: stems + synonyms, deduped. */
export function canonicalTerms(text: string): Set<string> {
  const terms = new Set<string>();
  for (const raw of tokenize(text)) {
    for (const v of stemVariants(raw)) {
      terms.add(v);
      const syn = SYNONYMS[v];
      if (syn) terms.add(syn);
    }
    const syn = SYNONYMS[raw];
    if (syn) terms.add(syn);
  }
  return terms;
}

interface IndexedEntry {
  entry: KbEntry;
  keyTerms: Set<string>;
  bodyTerms: Set<string>;
  questionTerms: Set<string>;
}

const index: IndexedEntry[] = knowledgeBase.map((entry) => ({
  entry,
  keyTerms: canonicalTerms(
    [entry.title, entry.question, entry.keywords.join(" ")].join(" \n "),
  ),
  bodyTerms: canonicalTerms(
    [entry.answer, (entry.steps ?? []).join(" ")].join(" \n "),
  ),
  questionTerms: canonicalTerms(entry.question),
}));

/** Document frequency of each key term across the KB — rare terms are decisive. */
const keyDf = new Map<string, number>();
for (const item of index) {
  for (const term of item.keyTerms) keyDf.set(term, (keyDf.get(term) ?? 0) + 1);
}

function termWeight(term: string): number {
  const df = keyDf.get(term) ?? 3;
  if (df <= 1) return 1.5;
  if (df <= 3) return 1.0;
  if (df <= 6) return 0.5;
  return 0.25;
}

export interface KbMatch {
  entry: KbEntry;
  score: number;
  /** Key terms (entry side) that the message hit, rarest first. */
  keyHits: string[];
  confident: boolean;
}

const CONFIDENT_SCORE = 1.4;
const NON_SIGNAL_TERMS = new Set([
  "cadence",
  "what",
  "how",
  "which",
  "who",
  "does",
  "do",
  "is",
  "are",
  "can",
]);

export function scoreKnowledge(
  message: string,
  only?: (e: KbEntry) => boolean,
): KbMatch[] {
  const msg = canonicalTerms(message);
  // Terms the customer actually typed (stemmed, no synonym expansion). A hit has
  // to come from one of these, so recall-boosting synonyms can never on their own
  // make us "confident" about an entry the message never really mentioned.
  const literal = literalTerms(message);
  const results: KbMatch[] = [];

  for (const item of index) {
    if (only && !only(item.entry)) continue;

    // Iterate over the ENTRY's key terms (not the message's), so one word in the
    // message counts once no matter how many stem variants it produced.
    const keyHits: string[] = [];
    let score = 0;
    for (const term of item.keyTerms) {
      if (msg.has(term)) {
        keyHits.push(term);
        score += termWeight(term);
      }
    }

    let bodyHits = 0;
    for (const term of item.bodyTerms) {
      if (!item.keyTerms.has(term) && msg.has(term)) bodyHits += 1;
    }
    score += Math.min(bodyHits, 3) * 0.3;

    // Bonus when the message closely restates the entry's canonical question.
    let qHits = 0;
    for (const term of item.questionTerms) if (msg.has(term)) qHits += 1;
    const coverage = item.questionTerms.size
      ? qHits / item.questionTerms.size
      : 0;
    if (item.questionTerms.size > 1 && coverage >= 0.6) score += 1.5;

    const literalHits = keyHits.filter((term) => literal.has(term));
    const signalHits = literalHits.filter(
      (term) => !NON_SIGNAL_TERMS.has(term),
    );
    const messageSignalTerms = [...literal].filter(
      (term) => !NON_SIGNAL_TERMS.has(term) && !term.endsWith("'"),
    );
    const rarest = Math.max(0, ...signalHits.map((term) => termWeight(term)));
    // Two independent literal signal terms clear the bar on their own. A
    // single distinctive term only counts when it is the whole substantive
    // query ("hipaa" or "timezone"), so a generic business name plus one
    // unrelated word cannot drag us to an unrelated entry.
    const confident =
      score >= CONFIDENT_SCORE &&
      signalHits.length >= 1 &&
      (signalHits.length >= 2 ||
        (rarest >= 1.5 &&
          signalHits.length === 1 &&
          messageSignalTerms.length === 1));

    keyHits.sort((a, b) => termWeight(b) - termWeight(a));
    results.push({
      entry: item.entry,
      score: Number(score.toFixed(3)),
      keyHits,
      confident,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Best match if (and only if) it is confident; `null` means "say I don't know". */
export function retrieve(
  message: string,
  only?: (e: KbEntry) => boolean,
): KbMatch | null {
  const [best] = scoreKnowledge(message, only);
  return best && best.confident ? best : null;
}

/**
 * The same deterministic matcher, indexed from a caller-provided knowledge base.
 * The setup preview uses this in the browser so custom entries never need an API
 * key or a server/database round trip.
 */
export function scoreKnowledgeFromEntries(
  message: string,
  entries: KbEntry[],
): KbMatch[] {
  const indexed = entries.map((entry) => ({
    entry,
    keyTerms: canonicalTerms(
      [entry.title, entry.question, entry.keywords.join(" ")].join(" "),
    ),
    bodyTerms: canonicalTerms(
      [entry.answer, (entry.steps ?? []).join(" ")].join(" "),
    ),
    questionTerms: canonicalTerms(entry.question),
  }));
  const df = new Map<string, number>();
  for (const item of indexed)
    for (const term of item.keyTerms) df.set(term, (df.get(term) ?? 0) + 1);
  const weight = (term: string) => {
    const count = df.get(term) ?? 3;
    return count <= 1 ? 1.5 : count <= 3 ? 1 : count <= 6 ? 0.5 : 0.25;
  };
  const msg = canonicalTerms(message);
  const literal = literalTerms(message);
  const results: KbMatch[] = [];
  for (const item of indexed) {
    const keyHits: string[] = [];
    let score = 0;
    for (const term of item.keyTerms) {
      if (msg.has(term)) {
        keyHits.push(term);
        score += weight(term);
      }
    }
    let bodyHits = 0;
    for (const term of item.bodyTerms)
      if (!item.keyTerms.has(term) && msg.has(term)) bodyHits += 1;
    score += Math.min(bodyHits, 3) * 0.3;
    let qHits = 0;
    for (const term of item.questionTerms) if (msg.has(term)) qHits += 1;
    const coverage = item.questionTerms.size
      ? qHits / item.questionTerms.size
      : 0;
    if (item.questionTerms.size > 1 && coverage >= 0.6) score += 1.5;
    const literalHits = keyHits.filter((term) => literal.has(term));
    const signalHits = literalHits.filter(
      (term) => !NON_SIGNAL_TERMS.has(term),
    );
    const messageSignalTerms = [...literal].filter(
      (term) => !NON_SIGNAL_TERMS.has(term) && !term.endsWith("'"),
    );
    const rarest = Math.max(0, ...signalHits.map((term) => weight(term)));
    const confident =
      score >= CONFIDENT_SCORE &&
      signalHits.length >= 1 &&
      (signalHits.length >= 2 ||
        (rarest >= 1.5 &&
          signalHits.length === 1 &&
          messageSignalTerms.length === 1));
    keyHits.sort((a, b) => weight(b) - weight(a));
    results.push({
      entry: item.entry,
      score: Number(score.toFixed(3)),
      keyHits,
      confident,
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

export function retrieveFromKnowledgeBase(
  message: string,
  entries: KbEntry[],
): KbMatch | null {
  const [best] = scoreKnowledgeFromEntries(message, entries);
  return best && best.confident ? best : null;
}

export function retrieveTroubleshooting(message: string): KbMatch | null {
  return retrieve(message, (e) => e.kind === "troubleshooting");
}

/** Sample questions for the "I don't know what to ask" path. */
export function sampleQuestions(limit = 4): string[] {
  const ids = [
    "pricing-plans",
    "integrations",
    "free-trial",
    "getting-started",
    "support-hours",
  ];
  return ids
    .map((id) => getKbEntry(id))
    .filter((e): e is KbEntry => Boolean(e))
    .slice(0, limit)
    .map((e) => e.question);
}

export function kbSize(): number {
  return knowledgeBase.length;
}
