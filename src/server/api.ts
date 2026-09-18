/**
 * Server functions — the only bridge between the browser and server-only code
 * (database, secrets). Kept in one file so the widget never imports `store.ts`
 * or anything else that touches `process.env`.
 */

import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { business } from "~/content/business";
import { handleTurn, initialState, type TurnInput, type TurnResult } from "./engine";
import * as store from "./store";

export type { TurnResult } from "./engine";

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export interface ChatRequest {
  businessId?: string;
  conversationId?: string | null;
  message?: string;
  action?: TurnInput["action"];
  state?: unknown;
}

export const chatTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as ChatRequest;
    return {
      businessId: typeof obj.businessId === "string" ? obj.businessId : business.id,
      conversationId: typeof obj.conversationId === "string" ? obj.conversationId : null,
      message: typeof obj.message === "string" ? obj.message.slice(0, 2000) : "",
      action: typeof obj.action === "string" ? obj.action : "send",
      state: obj.state ?? initialState(),
    } satisfies ChatRequest;
  })
  .handler(async ({ data }): Promise<TurnResult> => {
    return handleTurn(data as TurnInput);
  });

/* ------------------------------------------------------------------ */
/* Operator view                                                       */
/* ------------------------------------------------------------------ */

function passwordMatches(supplied: string, expected: string): boolean {
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface OperatorPayload {
  ok: boolean;
  error?: string;
  /** true when OPERATOR_PASSWORD is unset — the page shows a warning banner. */
  passwordConfigured: boolean;
  storage: store.StorageStatus;
  leads: store.LeadRecord[];
  tickets: store.TicketRecord[];
  conversations: store.ConversationSummary[];
  transcript?: store.ConversationTranscript | null;
}

export const operatorData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as { password?: string; conversationId?: string };
    return {
      password: typeof obj.password === "string" ? obj.password : "",
      conversationId: typeof obj.conversationId === "string" ? obj.conversationId : undefined,
    };
  })
  .handler(async ({ data }): Promise<OperatorPayload> => {
    const expected = process.env.OPERATOR_PASSWORD;
    const passwordConfigured = Boolean(expected);
    const blank: OperatorPayload = {
      ok: false,
      passwordConfigured,
      storage: { configured: store.databaseConfigured(), reachable: false, driver: store.driverKind() },
      leads: [],
      tickets: [],
      conversations: [],
    };

    if (expected && !passwordMatches(data.password, expected)) {
      return { ...blank, error: "Incorrect password." };
    }

    const storage = await store.storageStatus();
    if (!storage.reachable) {
      return { ...blank, ok: true, storage, error: storage.error ?? "Database not reachable." };
    }

    try {
      const [leads, tickets, conversations] = await Promise.all([
        store.listLeads(50),
        store.listTickets(50),
        store.listConversations(30),
      ]);
      const transcript = data.conversationId ? await store.getTranscript(data.conversationId) : undefined;
      return { ok: true, passwordConfigured, storage, leads, tickets, conversations, transcript };
    } catch (err) {
      return {
        ...blank,
        ok: false,
        passwordConfigured,
        storage,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

/** The install snippet always targets the published widget host, not a preview proxy host. */
export const siteOrigin = createServerFn({ method: "GET" }).handler(
  async () => "https://f84c49587847aae2d38ee792763f89f2.ctonew.app",
);

/** Small public health check, used by the demo page footer. */
export const storageHealth = createServerFn({ method: "GET" }).handler(async () => {
  const status = await store.storageStatus();
  return {
    configured: status.configured,
    reachable: status.reachable,
    driver: status.driver,
    error: status.error ? status.error.slice(0, 300) : undefined,
    leads: status.reachable ? (await store.listLeads(1)).length : 0,
  };
});
