/**
 * Real-time abuse blocking for login/signup, backed by Upstash Redis.
 *
 * Reads either the Vercel Marketplace integration's env var names
 * (KV_REST_API_URL / KV_REST_API_TOKEN, set automatically when Upstash for
 * Redis is provisioned through Vercel's Storage tab) or the plain Upstash
 * account names (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, set
 * when connecting an Upstash account directly). Fails open (never blocks,
 * never throws) when neither pair is set, so this ships safely before the
 * integration exists and works with zero config in local dev — same
 * "don't break the app for missing infra" philosophy as store.ts.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

function makeLimiter(prefix: string, limit: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `receptio:${prefix}`,
  });
}

const loginLimiter = makeLimiter("login", 5, 300); // 5 attempts / 5 min / IP
const signupLimiter = makeLimiter("signup", 3, 3600); // 3 signups / hour / IP

export async function checkLoginRateLimit(ip: string | null): Promise<{ blocked: boolean }> {
  if (!loginLimiter || !ip) return { blocked: false };
  try {
    const { success } = await loginLimiter.limit(ip);
    return { blocked: !success };
  } catch {
    return { blocked: false };
  }
}

export async function checkSignupRateLimit(ip: string | null): Promise<{ blocked: boolean }> {
  if (!signupLimiter || !ip) return { blocked: false };
  try {
    const { success } = await signupLimiter.limit(ip);
    return { blocked: !success };
  } catch {
    return { blocked: false };
  }
}
