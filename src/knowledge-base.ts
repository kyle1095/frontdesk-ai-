import {
  knowledgeBase,
  type KbCategory,
  type KbEntry,
} from "~/content/business";

export const KNOWLEDGE_BASE_STORAGE_KEY = "frontdesk.knowledge-base.v1";

export const STARTER_TEXT = `Q: What are your support hours?
A: Support is available Monday to Friday, 9am–5pm local time. Messages outside those hours are answered the next business day.
Keywords: support, hours, availability

Q: How do I reset my password?
A: Choose “Forgot password” on the sign-in screen, enter your work email, and follow the link. If it does not arrive, check spam or ask an administrator to unlock your account.
Keywords: password, login, reset

Q: Do you offer onboarding?
A: Yes. Every new account gets a guided onboarding call and a checklist for inviting staff, connecting calendars, and publishing the booking page.
Keywords: onboarding, setup, training`;

const CATEGORY_NAMES = new Set<KbCategory>([
  "product",
  "pricing",
  "trial",
  "sales",
  "integrations",
  "setup",
  "policies",
  "troubleshooting",
]);

function slugify(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || `entry-${index + 1}`;
}

function categoryFor(value: string | undefined): KbCategory {
  const normalized = value?.trim().toLowerCase() as KbCategory | undefined;
  return normalized && CATEGORY_NAMES.has(normalized) ? normalized : "product";
}

function cleanLine(value: string): string {
  return value.replace(/^\s*[-*]\s*/, "").trim();
}

/**
 * Parse a deliberately small, readable format: one blank-line-separated block
 * per entry, with Q:/A: (or Question:/Answer:) lines. Title, Keywords, Category,
 * Type and numbered Steps are optional. Markdown headings are accepted as titles.
 */
export function parseKnowledgeText(source: string): KbEntry[] {
  const blocks = source
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  const entries: KbEntry[] = [];

  for (const [index, block] of blocks.entries()) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    let title = "";
    let question = "";
    let answerLines: string[] = [];
    let keywords: string[] = [];
    let category: KbCategory = "product";
    let kind: KbEntry["kind"] = "faq";
    let steps: string[] = [];
    let escalate: string | undefined;
    let section: "answer" | "steps" | "none" = "none";

    for (const line of lines) {
      const match = line.match(
        /^(title|q|question|a|answer|keywords?|category|type|steps?|escalate)\s*:\s*(.*)$/i,
      );
      if (match) {
        const label = match[1].toLowerCase();
        const value = match[2].trim();
        if (label === "title") title = value;
        else if (label === "q" || label === "question") question = value;
        else if (label === "a" || label === "answer") {
          answerLines = value ? [value] : [];
          section = "answer";
        } else if (label === "keywords" || label === "keyword") {
          keywords = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        } else if (label === "category") category = categoryFor(value);
        else if (label === "type")
          kind = /trouble|problem|fix/i.test(value) ? "troubleshooting" : "faq";
        else if (label === "steps" || label === "step") section = "steps";
        else if (label === "escalate") escalate = value || undefined;
        continue;
      }

      const heading = line.match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        title = heading[1].trim();
        continue;
      }
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (numbered && (section === "steps" || kind === "troubleshooting")) {
        steps.push(numbered[1].trim());
        continue;
      }
      if (!question && /\?$/.test(line)) {
        question = line;
        continue;
      }
      if (section === "steps") steps.push(cleanLine(line));
      else answerLines.push(line);
    }

    const answer = answerLines.join(" ").replace(/\s+/g, " ").trim();
    if (!question && title)
      question = title.endsWith("?")
        ? title
        : `Tell me about ${title.toLowerCase()}.`;
    if (!title)
      title =
        question.replace(/[?!.]+$/, "").trim() ||
        `Knowledge entry ${index + 1}`;
    if (!answer || !question) continue;

    const inferred = `${title} ${question} ${answer}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2);
    const dedupedKeywords = [...new Set([...keywords, ...inferred])].slice(
      0,
      30,
    );
    entries.push({
      id: slugify(title || question, index),
      category,
      kind,
      title,
      question,
      answer: steps.length
        ? `${answer}\n\n${steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
        : answer,
      steps: steps.length ? steps : undefined,
      keywords: dedupedKeywords,
      escalate,
    });
  }
  return entries;
}

export function seededKnowledgeBase(): KbEntry[] {
  return knowledgeBase.map((entry) => ({
    ...entry,
    keywords: [...entry.keywords],
    steps: entry.steps ? [...entry.steps] : undefined,
  }));
}

export function readSavedKnowledgeBase(): KbEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return null;
    return value.filter((entry): entry is KbEntry =>
      Boolean(
        entry &&
        typeof entry === "object" &&
        "question" in entry &&
        "answer" in entry,
      ),
    );
  } catch {
    return null;
  }
}

export function saveKnowledgeBase(entries: KbEntry[]): void {
  window.localStorage.setItem(
    KNOWLEDGE_BASE_STORAGE_KEY,
    JSON.stringify(entries),
  );
}

export function clearSavedKnowledgeBase(): void {
  window.localStorage.removeItem(KNOWLEDGE_BASE_STORAGE_KEY);
}
