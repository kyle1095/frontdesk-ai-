/**
 * Best-effort request metadata (IP, user agent) for security/issue logging.
 *
 * `currentRequestContext()` relies on TanStack Start's request-scoped
 * AsyncLocalStorage context — the same mechanism `getCookie`/`setCookie`
 * already use in `auth.ts` — so it works from any function called
 * synchronously within a `createServerFn` handler's async chain, not just
 * the handler itself.
 */

import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export function currentRequestContext(): RequestContext {
  try {
    return {
      ip: getRequestIP({ xForwardedFor: true }) ?? null,
      userAgent: getRequestHeader("user-agent") ?? null,
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** For src/routes/api/chat.ts's raw Request, which has no createServerFn context. */
export function requestContextFromRequest(request: Request): RequestContext {
  const xff = request.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : request.headers.get("x-real-ip");
  return { ip: ip || null, userAgent: request.headers.get("user-agent") || null };
}
