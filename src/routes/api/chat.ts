import { createFileRoute } from "@tanstack/react-router";
import { business } from "~/content/business";
import { handleTurn, initialState, type TurnInput } from "~/server/engine";

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
          };
          return withCors(Response.json(await handleTurn(input)));
        } catch (error) {
          return withCors(
            Response.json(
              {
                error:
                  error instanceof Error
                    ? error.message
                    : "Invalid chat request.",
              },
              { status: 400 },
            ),
          );
        }
      },
    },
  },
});
