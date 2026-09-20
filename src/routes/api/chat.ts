import { createFileRoute } from "@tanstack/react-router";
import { business } from "~/content/business";
import { handleTurn, initialState, type TurnInput } from "~/server/engine";
import { requestContextFromRequest } from "~/server/requestContext";
import * as store from "~/server/store";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS))
    headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      OPTIONS: async () => withCors(new Response(null, { status: 204 })),
      POST: async ({ request }) => {
        const { ip, userAgent } = requestContextFromRequest(request);
        try {
          const raw = (await request.json()) as Record<string, unknown>;
          const input: TurnInput = {
            businessId:
              typeof raw.businessId === "string" ? raw.businessId : business.id,
            conversationId:
              typeof raw.conversationId === "string"
                ? raw.conversationId
                : null,
            message:
              typeof raw.message === "string" ? raw.message.slice(0, 2000) : "",
            action:
              typeof raw.action === "string"
                ? (raw.action as TurnInput["action"])
                : "send",
            state: raw.state ?? initialState(),
            source:
              new URL(request.url).searchParams.get("ref")?.trim().slice(0, 120) ||
              (typeof raw.source === "string" ? raw.source.slice(0, 120) : null),
            entryPoint:
              typeof raw.entryPoint === "string" ? raw.entryPoint.slice(0, 200) : null,
            ip,
            userAgent,
          };
          return withCors(Response.json(await handleTurn(input)));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid chat request.";
          void store.logIssue({
            source: "routes/api/chat",
            message,
            requestPath: request.url,
            ip,
            userAgent,
          });
          return withCors(
            Response.json(
              { error: "Invalid chat request." },
              { status: 400 },
            ),
          );
        }
      },
    },
  },
});
