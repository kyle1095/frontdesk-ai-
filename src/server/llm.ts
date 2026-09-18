/**
 * Optional LLM layer.
 *
 * The product must work with NO external API key — the retrieval + template path
 * in `engine.ts` is the real one. This module is the upgrade seam: if
 * `OPENAI_API_KEY` is present in the server environment, the engine can ask the
 * model to (a) pick which retrieved knowledge-base entry a message is about, or
 * (b) reword an answer we already retrieved.
 *
 * Hard guardrails, so an LLM can never become a source of invented facts:
 *  - routing may only return one of the candidate entry ids we pass in;
 *  - rewording may only receive text that came from the knowledge base, and its
 *    output is rejected if it is empty, too long, or introduces a number/currency
 *    that was not in the source text;
 *  - any error, timeout or unexpected shape falls back to the deterministic path.
 *
 * With no key set, every function here is a no-op returning null.
 */

import type { KbEntry } from "~/content/business";

export interface LlmLayer {
  enabled: boolean;
  /** Pick the entry a message is about, from candidates we already retrieved. */
  route(message: string, candidates: { id: string; title: string; question: string }[]): Promise<string | null>;
  /** Reword a retrieved answer without adding facts. */
  reword(entry: KbEntry, draft: string): Promise<string | null>;
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 7000;

export function llmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function chat(system: string, user: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

function numbersIn(text: string): string[] {
  return (text.match(/\d[\d.,]*/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
}

function rewordIsSafe(source: string, output: string): boolean {
  if (output.length < 20) return false;
  if (output.length > Math.max(600, source.length * 3)) return false;
  const allowed = new Set(numbersIn(source));
  return numbersIn(output).every((n) => allowed.has(n));
}

export const llm: LlmLayer = {
  enabled: llmEnabled(),

  async route(message, candidates) {
    if (!llmEnabled() || candidates.length === 0) return null;
    const list = candidates.map((c) => `- ${c.id}: ${c.title} (${c.question})`).join("\n");
    const out = await chat(
      "You route support messages to help content. Reply with JSON only: {\"id\":\"<one of the given ids>\"} or {\"id\":null} if none fit. Never invent an id.",
      `Message: ${message}\n\nCandidates:\n${list}`,
    );
    if (!out) return null;
    try {
      const parsed = JSON.parse(out.replace(/^```json|```$/g, "").trim()) as { id?: string | null };
      const id = parsed.id ?? null;
      return id && candidates.some((c) => c.id === id) ? id : null;
    } catch {
      return null;
    }
  },

  async reword(entry, draft) {
    if (!llmEnabled()) return null;
    const out = await chat(
      "Reword the given support answer to be friendlier and shorter. You must not add, remove, soften or invent any fact, price, number, time or promise. Keep every number exactly as written. Reply with the reworded text only.",
      `Title: ${entry.title}\n\nAnswer to reword:\n${draft}`,
    );
    if (!out) return null;
    return rewordIsSafe(draft, out) ? out : null;
  },
};
