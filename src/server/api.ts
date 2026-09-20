/**
 * Server functions — the only bridge between the browser and server-only code
 * (database, secrets). Kept in one file so the widget never imports `store.ts`
 * or anything else that touches `process.env`.
 */

import { createServerFn } from "@tanstack/react-start";
// Authentication uses the table-backed session helpers below.
import { business } from "~/content/business";
import {
  handleTurn,
  initialState,
  type TurnInput,
  type TurnResult,
} from "./engine";
import * as store from "./store";
import * as auth from "./auth";
import { currentRequestContext } from "./requestContext";
import { getRequestUrl } from "@tanstack/react-start/server";

export type { TurnResult } from "./engine";

export type AuthResponse = {
  ok: boolean;
  error?: string;
  account?: auth.Account;
};

export const authSignup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as Record<string, unknown>;
    return {
      email: typeof obj.email === "string" ? obj.email : "",
      password: typeof obj.password === "string" ? obj.password : "",
      businessName:
        typeof obj.businessName === "string" ? obj.businessName : "",
      signupSource:
        typeof obj.signupSource === "string" ? obj.signupSource.slice(0, 120) : null,
    };
  })
  .handler(async ({ data }): Promise<AuthResponse> =>
    auth.signup(data.email, data.password, data.businessName, data.signupSource),
  );

export const authLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as Record<string, unknown>;
    return {
      email: typeof obj.email === "string" ? obj.email : "",
      password: typeof obj.password === "string" ? obj.password : "",
    };
  })
  .handler(async ({ data }): Promise<AuthResponse> =>
    auth.login(data.email, data.password),
  );

export const authLogout = createServerFn({ method: "POST" }).handler(async () => {
  await auth.destroySession();
  return { ok: true };
});

export const authMe = createServerFn({ method: "GET" }).handler(async () =>
  auth.currentAccount(),
);

export const accountPlan = createServerFn({ method: "GET" }).handler(async () => {
  const account = await auth.currentAccount();
  if (!account) return { ok: false as const, error: "Sign-in required." };
  const plan = await store.getBusinessPlanUsage(account.businessId);
  return { ok: true as const, account, plan };
});

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export interface ChatRequest {
  businessId?: string;
  conversationId?: string | null;
  message?: string;
  action?: TurnInput["action"];
  state?: unknown;
  source?: string | null;
  entryPoint?: string | null;
}

export const chatTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as ChatRequest;
    return {
      businessId:
        typeof obj.businessId === "string" ? obj.businessId : business.id,
      conversationId:
        typeof obj.conversationId === "string" ? obj.conversationId : null,
      message:
        typeof obj.message === "string" ? obj.message.slice(0, 2000) : "",
      action: typeof obj.action === "string" ? obj.action : "send",
      state: obj.state ?? initialState(),
      source: typeof obj.source === "string" ? obj.source.slice(0, 120) : null,
      entryPoint: typeof obj.entryPoint === "string" ? obj.entryPoint.slice(0, 200) : null,
    } satisfies ChatRequest;
  })
  .handler(async ({ data }): Promise<TurnResult> => {
    const { ip, userAgent } = currentRequestContext();
    return handleTurn({ ...data, ip, userAgent } as TurnInput);
  });

/* ------------------------------------------------------------------ */
/* Operator view                                                       */
/* ------------------------------------------------------------------ */

export interface OperatorPayload {
  ok: boolean;
  error?: string;
  account?: auth.Account;
  plan?: store.BusinessPlanUsage;
  storage: store.StorageStatus;
  leads: store.LeadRecord[];
  tickets: store.TicketRecord[];
  conversations: store.ConversationSummary[];
  conversationSourceCounts: store.ConversationSourceCount[];
  searchResults: store.ConversationSearchResult[];
  knowledgeBase: store.KnowledgeBaseEntry[];
  transcript?: store.ConversationTranscript | null;
}

export const operatorData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as {
      conversationId?: string;
      search?: string;
    };
    return {
      conversationId:
        typeof obj.conversationId === "string" ? obj.conversationId : undefined,
      search: typeof obj.search === "string" ? obj.search.slice(0, 200) : "",
    };
  })
  .handler(async ({ data }): Promise<OperatorPayload> => {
    const account = await auth.currentAccount();
    const blank: OperatorPayload = {
      ok: false,
      storage: {
        configured: store.databaseConfigured(),
        reachable: false,
        driver: store.driverKind(),
      },
      leads: [],
      tickets: [],
      conversations: [],
      conversationSourceCounts: [],
      searchResults: [],
      knowledgeBase: [],
    };
    if (!account) return { ...blank, error: "Sign-in required." };

    const storage = await store.storageStatus();
    if (!storage.reachable) {
      return {
        ...blank,
        ok: true,
        account,
        storage,
        error: storage.error ?? "Database not reachable.",
      };
    }

    try {
      const [plan, leads, tickets, conversations, conversationSourceCounts, searchResults, knowledgeBase] = await Promise.all([
        store.getBusinessPlanUsage(account.businessId),
        store.listLeads(account.businessId, 50),
        store.listTickets(account.businessId, 50),
        store.listConversations(account.businessId, 30),
        store.listConversationSourceCounts(account.businessId),
        store.searchConversations(account.businessId, data.search, 30),
        store.listKnowledgeBase(account.businessId),
      ]);
      const transcript = data.conversationId
        ? await store.getTranscript(data.conversationId, account.businessId)
        : undefined;
      return {
        ok: true,
        account,
        plan,
        storage,
        leads,
        tickets,
        conversations,
        conversationSourceCounts,
        searchResults,
        knowledgeBase,
        transcript,
      };
    } catch (err) {
      return {
        ...blank,
        account,
        ok: false,
        storage,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const operatorSecurityEvents = createServerFn({ method: "POST" }).handler(async () => {
  const account = await auth.currentAccount();
  if (!account) return { ok: false as const, error: "Sign-in required." };
  return { ok: true as const, events: await store.listSecurityEvents(account.businessId, 100) };
});

export const operatorIssueLog = createServerFn({ method: "POST" }).handler(async () => {
  const account = await auth.currentAccount();
  if (!account) return { ok: false as const, error: "Sign-in required." };
  return { ok: true as const, issues: await store.listIssueLog(account.businessId, 100) };
});

export interface OperatorMutationResponse {
  ok: boolean;
  error?: string;
}

export const operatorUpdateTicketStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as {
      ticketId?: number;
      status?: string;
    };
    return {
      ticketId:
        typeof obj.ticketId === "number" ? obj.ticketId : Number(obj.ticketId),
      status: typeof obj.status === "string" ? obj.status : "",
    };
  })
  .handler(async ({ data }): Promise<OperatorMutationResponse> => {
    const account = await auth.currentAccount();
    if (!account) return { ok: false, error: "Sign-in required." };
    if (
      !Number.isInteger(data.ticketId) ||
      data.ticketId < 1 ||
      !store.isTicketStatus(data.status)
    ) {
      return { ok: false, error: "Invalid ticket update." };
    }
    const result = await store.updateTicketStatus(data.ticketId, data.status, account.businessId);
    if (result.ok) {
      void store.logSecurityEvent({
        eventType: "operator_ticket_status_changed",
        severity: "info",
        businessId: account.businessId,
        accountId: account.id,
        actorEmail: account.email,
        detail: { ticketId: data.ticketId, status: data.status },
      });
    }
    return result;
  });

function knowledgeInput(value: unknown): store.KnowledgeBaseInput {
  const obj = (value ?? {}) as Record<string, unknown>;
  const categories = ["product", "pricing", "trial", "sales", "integrations", "setup", "policies", "troubleshooting"] as const;
  const category = categories.includes(obj.category as (typeof categories)[number]) ? (obj.category as (typeof categories)[number]) : "product";
  return {
    id: typeof obj.id === "string" ? obj.id : undefined,
    kind: obj.kind === "troubleshooting" ? "troubleshooting" : "faq",
    category,
    title: typeof obj.title === "string" ? obj.title.slice(0, 200) : "",
    question: typeof obj.question === "string" ? obj.question.slice(0, 500) : "",
    answer: typeof obj.answer === "string" ? obj.answer.slice(0, 5000) : "",
    keywords: Array.isArray(obj.keywords) ? obj.keywords.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 80)).slice(0, 50) : [],
    steps: Array.isArray(obj.steps) ? obj.steps.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 500)).slice(0, 20) : [],
    escalate: typeof obj.escalate === "string" ? obj.escalate.slice(0, 1000) : undefined,
  };
}

export const operatorCreateKnowledgeBase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => knowledgeInput(data))
  .handler(async ({ data }): Promise<OperatorMutationResponse & { entry?: store.KnowledgeBaseEntry }> => {
    const account = await auth.currentAccount();
    if (!account) return { ok: false, error: "Sign-in required." };
    const result = await store.createKnowledgeBaseEntry(account.businessId, data);
    if (result.ok) {
      void store.logSecurityEvent({
        eventType: "operator_kb_created",
        severity: "info",
        businessId: account.businessId,
        accountId: account.id,
        actorEmail: account.email,
        detail: { entryId: result.entry?.id, title: data.title },
      });
    }
    return result;
  });

export const operatorUpdateKnowledgeBase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => knowledgeInput(data))
  .handler(async ({ data }): Promise<OperatorMutationResponse & { entry?: store.KnowledgeBaseEntry }> => {
    const account = await auth.currentAccount();
    if (!account) return { ok: false, error: "Sign-in required." };
    if (!data.id) return { ok: false, error: "Entry id is required." };
    const result = await store.updateKnowledgeBaseEntry(account.businessId, data.id, data);
    if (result.ok) {
      void store.logSecurityEvent({
        eventType: "operator_kb_updated",
        severity: "info",
        businessId: account.businessId,
        accountId: account.id,
        actorEmail: account.email,
        detail: { entryId: data.id, title: data.title },
      });
    }
    return result;
  });

export const operatorDeleteKnowledgeBase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as Record<string, unknown>;
    return { id: typeof obj.id === "string" ? obj.id : "" };
  })
  .handler(async ({ data }): Promise<OperatorMutationResponse> => {
    const account = await auth.currentAccount();
    if (!account) return { ok: false, error: "Sign-in required." };
    if (!data.id) return { ok: false, error: "Entry id is required." };
    const result = await store.deleteKnowledgeBaseEntry(account.businessId, data.id);
    if (result.ok) {
      void store.logSecurityEvent({
        eventType: "operator_kb_deleted",
        severity: "info",
        businessId: account.businessId,
        accountId: account.id,
        actorEmail: account.email,
        detail: { entryId: data.id },
      });
    }
    return result;
  });

export const widgetBusiness = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const obj = (data ?? {}) as Record<string, unknown>;
    return { businessId: typeof obj.businessId === "string" ? obj.businessId : "cadence" };
  })
  .handler(async ({ data }) => {
    const profile = await store.getBusinessProfile(data.businessId);
    if (!profile) {
      const { ip, userAgent } = currentRequestContext();
      void store.logSecurityEvent({
        eventType: "invalid_widget_slug",
        severity: "warning",
        ip,
        userAgent,
        detail: { slug: data.businessId },
      });
    }
    return profile ?? { id: "cadence", name: "Cadence", slug: "cadence" };
  });

/**
 * The install snippet always targets the published production host, never a
 * preview-deployment URL. `VERCEL_PROJECT_PRODUCTION_URL` is the project's
 * stable production domain (the attached custom domain if one is set),
 * populated automatically by Vercel at build/runtime — it never points at a
 * preview alias. Falls back to deriving the origin from the actual request
 * (local dev, or any non-Vercel host).
 */
function resolveOrigin(): string {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionUrl) return `https://${productionUrl}`;
  try {
    return getRequestUrl({ xForwardedHost: true, xForwardedProto: true }).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export const installData = createServerFn({ method: "GET" }).handler(async () => ({
  origin: resolveOrigin(),
  account: await auth.currentAccount().catch(() => null),
}));

export const siteOrigin = createServerFn({ method: "GET" }).handler(
  async () => resolveOrigin(),
);

/** Small public health check, used by the demo page footer. */
export const storageHealth = createServerFn({ method: "GET" }).handler(
  async () => {
    const { ip, userAgent } = currentRequestContext();
    void store.logSecurityEvent({ eventType: "storage_probe", severity: "info", ip, userAgent });
    const status = await store.storageStatus();
    return {
      configured: status.configured,
      reachable: status.reachable,
      driver: status.driver,
      error: status.error ? status.error.slice(0, 300) : undefined,
      leads: status.reachable ? (await store.listLeads("cadence", 1)).length : 0,
    };
  },
);
