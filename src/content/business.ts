/**
 * SINGLE SOURCE OF TRUTH FOR THE DEMO BUSINESS.
 *
 * Everything the help desk knows and everything the demo page shows about the
 * fictional customer business ("Cadence") lives in this one file, so the whole
 * demo can be re-skinned by editing this file alone.
 *
 * Rules baked into the data model:
 *  - The engine only ever answers from `knowledgeBase`. If a question does not
 *    match an entry confidently, the help desk says it does not know and offers
 *    to pass it to a human. So: if a fact is not in here, the widget will not
 *    claim it.
 *  - Content is intentionally plain and verifiable-by-reading: plans, trial,
 *    integrations, setup and troubleshooting fixes. No claims about uptime
 *    numbers, customer counts or legal guarantees.
 */

export type KbCategory =
  | "product"
  | "pricing"
  | "trial"
  | "sales"
  | "integrations"
  | "setup"
  | "policies"
  | "troubleshooting";

export interface KbEntry {
  id: string;
  category: KbCategory;
  /** FAQ entries are answered directly; troubleshooting entries run a guided flow. */
  kind: "faq" | "troubleshooting";
  /** Human-readable title, also shown in the operator view. */
  title: string;
  /** A canonical user-style question (used for retrieval scoring and suggestions). */
  question: string;
  /** The grounded answer. Only this text (plus `steps`) is ever shown. */
  answer: string;
  /** Ordered real fix steps, for troubleshooting entries. */
  steps?: string[];
  /** Terms that make this entry a confident match. */
  keywords: string[];
  /** Shown after a troubleshooting answer that did not resolve the issue. */
  escalate?: string;
}

export interface SalesSlot {
  id: string;
  /** e.g. "Tue 23 Sep, 10:00–10:30 (ET)" */
  label: string;
  /** ISO-ish UTC instant for the slot start. */
  startsAt: string;
}

/** The business whose site the widget is embedded on. */
export const business = {
  id: "cadence",
  name: "Cadence",
  tagline: "Scheduling software for clinics",
  shortDescription:
    "Cadence is scheduling software for clinics: online booking, staff calendars, reminders and telehealth links in one place.",
  // Copy for the demo page — this is the fictional customer's marketing site.
  hero: {
    headline: "Scheduling that keeps your clinic running on time",
    subhead:
      "Cadence gives clinics online booking, shared staff calendars, automatic reminders and telehealth links — so front desks stop juggling phone calls.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
  },
  features: [
    {
      title: "Online booking page",
      body: "Patients pick their own slot from your live availability. No phone tag, no double booking.",
    },
    {
      title: "Shared staff calendars",
      body: "Every provider's schedule in one view, synced both ways with Google Calendar and Microsoft 365.",
    },
    {
      title: "Automatic reminders",
      body: "Email and SMS reminders go out before the appointment; patients can confirm or reschedule themselves.",
    },
    {
      title: "Telehealth built in",
      body: "Video visits get a link on the appointment and in the reminder, using Zoom or Google Meet.",
    },
  ],
  stats: [
    { value: "14 days", label: "Free trial, no card" },
    { value: "Mon–Fri", label: "8am–6pm ET support" },
    { value: "2-way", label: "Calendar sync" },
  ],
  nav: ["Product", "Pricing", "Integrations", "Support"],
  footerNote: "Cadence is a fictional business used to demonstrate a ReceptIO help desk.",
  demoBanner:
    "Sample business page. The widget in the corner is ReceptIO, the help desk Cadence embedded on this site.",
  supportHours: "Monday to Friday, 8am–6pm ET. Enterprise customers get 24/7 and a one hour response on P1 incidents.",
  timezone: "ET",
} as const;

export const helpDesk = {
  id: "cadence",
  name: "Cadence Support",
  greeting:
    "Hi, I'm the Cadence assistant. I can answer questions about Cadence, walk you through a fix, book you a demo, or file a ticket with the support team.",
  quickActions: [
    { label: "Ask a question", action: "ask" as const },
    { label: "Book a demo", action: "start_lead" as const },
    { label: "Report a problem", action: "start_ticket" as const },
  ],
  suggestions: [
    "How much does Cadence cost?",
    "Which calendars do you sync with?",
    "My calendar isn't syncing",
    "Appointments are showing the wrong timezone",
  ],
  /** Prompts the human handoff. Used verbatim when the knowledge base has no answer. */
  unknownFallback:
    "I don't have that in the Cadence help content I can see, and I'd rather not guess. I can pass it to a human on the support team as a ticket — they will answer here in your transcript.",
} as const;

/* ------------------------------------------------------------------ *
 * Knowledge base — 18 entries: 12 FAQs + 6 troubleshooting topics.
 * ------------------------------------------------------------------ */

export const knowledgeBase: KbEntry[] = [
  {
    id: "what-is-cadence",
    category: "product",
    kind: "faq",
    title: "What is Cadence?",
    question: "What is Cadence used for?",
    answer:
      "Cadence is scheduling software for clinics. It gives you an online booking page, shared staff calendars, automatic email and SMS appointment reminders, and telehealth video links — all in one place. It is built for outpatient and single-specialty clinics rather than hospitals.",
    keywords: ["what", "cadence", "product", "software", "used", "for", "about", "overview", "clinic", "scheduling", "do"],
  },
  {
    id: "who-is-it-for",
    category: "product",
    kind: "faq",
    title: "Who is Cadence for?",
    question: "Who is Cadence for?",
    answer:
      "Cadence is for small and mid-sized clinics: dental, physiotherapy, dermatology, veterinary and general practice. A typical customer has 1–10 locations and 3–40 staff who take appointments. It is not built for hospital-wide scheduling or inpatient bed management.",
    keywords: ["who", "for", "fit", "right", "suitable", "industry", "practice", "clinic", "size", "dental", "small"],
  },
  {
    id: "pricing-plans",
    category: "pricing",
    kind: "faq",
    title: "Plans and pricing",
    question: "How much does Cadence cost?",
    answer:
      "Cadence is billed per location, per month, in USD:\n• Starter — $59/month. One location, up to 5 staff calendars, online booking, email reminders.\n• Growth — $149/month. Up to 20 staff calendars, SMS reminders, waitlists and reporting.\n• Enterprise — custom pricing. Multiple locations, SSO/SAML, API access and FHIR export.\nEvery plan includes the booking page and two-way calendar sync. Annual billing saves two months.",
    keywords: ["pricing", "price", "cost", "much", "plans", "plan", "billing", "per", "month", "subscription", "tiers", "starter", "growth", "enterprise", "usd"],
  },
  {
    id: "free-trial",
    category: "trial",
    kind: "faq",
    title: "Free trial",
    question: "Is there a free trial?",
    answer:
      "Yes — 14 days on the Growth plan, with no credit card required. You keep your booking page and settings if you upgrade, and you can invite staff during the trial. When the trial ends, the account switches to read-only until you pick a plan; nothing is deleted for 30 days after that.",
    keywords: ["trial", "free", "try", "trial period", "card", "credit", "expires", "ends"],
  },
  {
    id: "book-demo",
    category: "sales",
    kind: "faq",
    title: "Booking a demo",
    question: "How do I book a demo?",
    answer:
      "Demos are 30 minutes on a weekday with a Cadence specialist, and they walk through booking, reminders and calendar sync using your own clinic's setup. You can request a slot right here in this chat — tell me your name, work email, clinic and what you need, and I will offer you times.",
    keywords: ["demo", "sales", "talk", "call", "walkthrough", "meeting", "specialist", "schedule"],
  },
  {
    id: "integrations",
    category: "integrations",
    kind: "faq",
    title: "Supported integrations",
    question: "Which calendars do you sync with?",
    answer:
      "Cadence syncs two-way with Google Calendar and Microsoft 365 / Outlook, and offers a read-only Apple Calendar (iCal) subscription feed. It also connects to Stripe for payments, Twilio for SMS, Zoom and Google Meet for telehealth video, and Zapier for anything else. Enterprise adds an API and a FHIR export.\nThere is no native Epic or Cerner integration — that has to go through the FHIR export on Enterprise.",
    keywords: ["integration", "integrations", "integrate", "sync", "google", "outlook", "microsoft", "365", "apple", "ical", "stripe", "twilio", "zoom", "meet", "zapier", "epic", "cerner", "ehr", "connect", "supports", "supported", "api"],
  },
  {
    id: "getting-started",
    category: "setup",
    kind: "faq",
    title: "Getting started / setup",
    question: "How do I set up Cadence?",
    answer:
      "Setup is four steps, usually under an hour: (1) create your account and name your location; (2) connect a calendar under Settings → Calendars and pick the booking calendar; (3) add your staff and set each person's working hours; (4) publish your booking page and share the link. Reminders and payments are optional and can be turned on later.",
    keywords: ["setup", "set", "started", "getting", "install", "onboarding", "configure", "how", "begin", "launch", "publish", "configured"],
  },
  {
    id: "security-compliance",
    category: "policies",
    kind: "faq",
    title: "Security and HIPAA",
    question: "Is Cadence HIPAA compliant?",
    answer:
      "Cadence is HIPAA compliant with a Business Associate Agreement (BAA) available on Growth and Enterprise plans. Patient data is encrypted in transit and at rest, access is role-based, and audit logs are kept for 12 months. Cadence holds a SOC 2 Type II report, which we can share under NDA from the sales conversation.",
    keywords: ["hipaa", "compliance", "compliant", "security", "secure", "baa", "soc", "encryption", "encrypted", "privacy", "gdpr", "audit", "data", "patient"],
  },
  {
    id: "reminders",
    category: "product",
    kind: "faq",
    title: "Appointment reminders",
    question: "How do reminders work?",
    answer:
      "Reminders are configured under Settings → Reminders. Email reminders can go at 48, 24 or 2 hours before an appointment; SMS reminders are available on Growth and Enterprise and are timed in each patient's own timezone. Each reminder includes a confirm and a reschedule link. Reminders only send to patients who provided a number or email and, for SMS, opted in.",
    keywords: ["reminder", "reminders", "email", "sms", "text", "notify", "notification", "confirm", "before", "appointment", "timing", "when"],
  },
  {
    id: "billing-changes",
    category: "pricing",
    kind: "faq",
    title: "Changing or cancelling a plan",
    question: "Can I cancel or change my plan?",
    answer:
      "You can upgrade, downgrade or cancel at any time from Settings → Billing. Changes to a paid plan take effect immediately and are prorated; cancellations stop the next payment and the account stays active until the end of the period you already paid for. Monthly plans are not refunded part-way through a period.",
    keywords: ["cancel", "cancellation", "change", "downgrade", "upgrade", "refund", "billing", "stop", "contract", "subscription", "switch"],
  },
  {
    id: "support-hours",
    category: "policies",
    kind: "faq",
    title: "Support hours and response targets",
    question: "What are your support hours?",
    answer:
      "Cadence support is available Monday to Friday, 8am–6pm ET through this chat. Tickets raised outside those hours are picked up the next business morning. Enterprise customers get 24/7 coverage and a one hour response target on P1 incidents (booking or calendar sync down).",
    keywords: ["support", "hours", "hour", "open", "response", "time", "sla", "available", "weekend", "urgent", "p1", "emergency", "contact", "human", "person"],
  },
  {
    id: "staff-and-locations",
    category: "pricing",
    kind: "faq",
    title: "Adding staff and locations",
    question: "How many staff can I add?",
    answer:
      "Staff seats are included up to your plan limit — 5 on Starter and 20 on Growth. Extra staff on Growth are $8 each per month; Starter cannot go past 5. Each additional location needs its own subscription at the plan's per-location price, and Enterprise is priced per agreement for multi-location groups.",
    keywords: ["staff", "seat", "seats", "user", "users", "add", "extra", "providers", "team", "location", "locations", "practice", "how", "many"],
  },

  /* ---------------- Troubleshooting ---------------- */

  {
    id: "calendar-not-syncing",
    category: "troubleshooting",
    kind: "troubleshooting",
    title: "Calendar is not syncing",
    question: "My calendar isn't syncing",
    answer:
      "Calendar sync issues are almost always the connection or the selected calendar. Let's check them in order.",
    steps: [
      "Open Settings → Calendars and check the connection: if it says 'Reconnect required', click Reconnect and sign into the calendar account again.",
      "Confirm the correct calendar is selected for booking. If you added a new primary calendar, Cadence keeps the old one until you change it here.",
      "Check the calendar's sharing permission. Cadence needs 'Make changes to events' — a read-only or 'free/busy only' share will import events but never write appointments back.",
      "Wait up to 15 minutes: Cadence syncs on a 5–15 minute cycle, so a just-added appointment can lag briefly.",
      "If the clinic shows the same calendar connected twice, remove the duplicate connection and reconnect once.",
    ],
    escalate: "If those steps didn't fix it, I can file a ticket with the support team — they will look at the sync logs for your clinic.",
    keywords: ["calendar", "sync", "syncing", "not", "isn't", "isnt", "google", "outlook", "events", "missing", "stopped", "reconnect", "connection", "two", "way", "update"],
  },
  {
    id: "appointment-not-saving",
    category: "troubleshooting",
    kind: "troubleshooting",
    title: "Appointment will not save",
    question: "Booking an appointment won't save",
    answer:
      "An appointment that refuses to save is normally a validation, conflict or browser-session problem. Work through these:",
    steps: [
      "Look for a red field or a message at the top of the form — a missing patient email/phone or an empty appointment type stops the save.",
      "Check for a clash: if the slot overlaps another appointment or a provider's buffer time, Cadence blocks the save. Move the start time by a few minutes and try again.",
      "Confirm the provider is scheduled to work that day — booking outside a staff member's working hours is rejected.",
      "Reload the booking page (a hard refresh) and re-enter the appointment. A session that timed out will look like a save that silently does nothing.",
      "If it still refuses, note the exact date, time and provider — that is what support needs to trace it.",
    ],
    escalate: "I can file a ticket with those details if it still won't save.",
    keywords: ["appointment", "save", "saving", "won't", "wont", "not", "saving", "book", "booking", "error", "form", "creating", "add", "cannot", "can't", "cant", "disappears", "failed"],
  },
  {
    id: "login-password-reset",
    category: "troubleshooting",
    kind: "troubleshooting",
    title: "Cannot log in / reset password",
    question: "I can't log in, how do I reset my password?",
    answer:
      "Let's get you back in. Most lockouts are the reset link timing out or an SSO account.",
    steps: [
      "On the sign-in screen choose 'Forgot password' and enter the email on your Cadence account — the reset link is valid for 30 minutes, so use it straight away.",
      "Check the spam or promotions folder: the reset message comes from a no-reply address and is often filtered on clinic mail servers.",
      "If the reset email never arrives, check whether your account was created through SSO (Google or Microsoft). SSO accounts have no Cadence password and must use the 'Sign in with' button instead.",
      "If you see 'account locked', wait 15 minutes: Cadence locks an account for 15 minutes after 8 failed attempts.",
      "Still stuck? A clinic admin can reset or unlock your account from Settings → Team.",
    ],
    escalate: "If none of that works I can file a ticket — include the email address on the account and the clinic name.",
    keywords: ["login", "log", "sign", "password", "reset", "locked", "lock", "access", "cannot", "can't", "cant", "account", "email", "forgot", "sso", "mfa", "authenticate"],
  },
  {
    id: "timezone-wrong",
    category: "troubleshooting",
    kind: "troubleshooting",
    title: "Appointments show the wrong timezone",
    question: "Appointments are showing the wrong timezone",
    answer:
      "Time zone mismatches come from three different settings, so check them in this order.",
    steps: [
      "Set the clinic time zone in Settings → Practice details. This is the default for the booking page and for new staff.",
      "Check each staff member: Settings → Team lets you override a person's time zone. A provider left on the wrong zone shows appointments shifted by the difference.",
      "Check your own profile time zone (top-right menu → My profile). Your calendar view is rendered in your profile zone, not the clinic's.",
      "Remember reminders are timed in the patient's own time zone, so a 24-hour SMS can look 'early' compared to the clinic clock.",
      "If times are still shifting for new appointments only, note one affected appointment and I can hand it to support.",
    ],
    escalate: "If a specific appointment is still wrong after those checks, I can file a ticket with the appointment details.",
    keywords: ["timezone", "time", "zone", "tz", "wrong", "utc", "gmt", "offset", "shifted", "hour", "dst", "daylight", "savings", "incorrect", "showing", "off", "early", "late", "shift", "behind", "ahead"],
  },
  {
    id: "import-failed",
    category: "troubleshooting",
    kind: "troubleshooting",
    title: "CSV import failed",
    question: "My patient CSV import failed",
    answer:
      "Imports fail on file shape rather than on the data itself. Check these against the import report:",
    steps: [
      "Keep the file to CSV with a header row, under 10 MB and no more than 5,000 rows — split larger lists into batches.",
      "Required columns are: patient name, appointment date, appointment time. Email and phone are optional but must be valid if present.",
      "Use ISO dates (2026-09-24) or MM/DD/YYYY, and 24-hour or AM/PM times consistently in one column. Mixed formats stop the whole batch.",
      "Remove duplicate patient emails within the file and any smart quotes or line breaks inside cells.",
      "Download the error report from the import screen — it lists the exact row and reason for every rejected row. Fix those rows and re-upload only them.",
    ],
    escalate: "If the report does not explain the failure, I can file a ticket and support can check the import logs.",
    keywords: ["import", "importing", "csv", "upload", "failed", "fails", "migration", "migrate", "patients", "file", "spreadsheet", "excel", "error", "rows", "bulk"],
  },
  {
    id: "reminders-not-sending",
    category: "troubleshooting",
    kind: "troubleshooting",
    title: "Reminders are not being sent",
    question: "Reminders aren't being sent to patients",
    answer:
      "Reminders have to be switched on, opted into, and scheduled with enough lead time. Check these:",
    steps: [
      "Confirm the reminder is switched on and has a send time in Settings → Reminders. A newly created appointment type starts with reminders off.",
      "Check the patient record: no email or mobile number means nothing to send to. For SMS the patient must have opted in.",
      "Check that the appointment is far enough ahead — reminders scheduled for 24 or 48 hours before will not send for an appointment booked inside that window.",
      "On SMS, verify your sending number is still verified under Settings → Reminders; an unverified number silently drops messages.",
      "Look at the appointment's activity log: it shows 'reminder queued' or a delivery failure, which tells you whether it was Cadence or the carrier.",
    ],
    escalate: "If reminders are queued but never delivered, I can file a ticket for the messaging team.",
    keywords: ["reminder", "reminders", "not", "aren't", "arent", "sending", "sent", "sms", "text", "email", "patients", "didn't", "didnt", "receive", "delivery", "missing", "no", "confirmation"],
  },
];

/**
 * Upcoming weekday sales-call slots. Fixed times on weekdays, generated at
 * request time so they are always in the future. No calendar integration — the
 * chosen slot is simply recorded on the lead for a human to confirm.
 */
export const SLOT_TIMES = ["10:00", "13:30", "15:30", "16:30"] as const;

export function upcomingSalesSlots(count = 4, now = new Date()): SalesSlot[] {
  const slots: SalesSlot[] = [];
  const cursor = new Date(now.getTime());
  cursor.setUTCHours(0, 0, 0, 0);
  while (slots.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay(); // 5 = Sat, 6 = Sun (UTC day; fine for a demo)
    if (day === 0 || day === 6) continue;
    const time = SLOT_TIMES[slots.length % SLOT_TIMES.length];
    const [h, m] = time.split(":").map(Number);
    const start = new Date(cursor.getTime());
    start.setUTCHours(h + 4, m, 0, 0); // 10:00 ET = 14:00 UTC (EDT, +4)
    slots.push({
      id: `slot-${slots.length + 1}`,
      label: `${start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}, ${time} ET (30 min)`,
      startsAt: start.toISOString(),
    });
  }
  return slots;
}

export function getKbEntry(id: string): KbEntry | undefined {
  return knowledgeBase.find((e) => e.id === id);
}
