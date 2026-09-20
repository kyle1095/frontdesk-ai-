/**
 * Real-time abuse blocking for login/signup, backed by Upstash Redis.
 *
 * Fails open (never blocks, never throws) when UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN aren't set, so this ships safely before the
 * Upstash account exists and works with zero config in local dev — same
 * "don't break the app for missing infra" philosophy as store.ts.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

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
