import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import * as store from "./store";
import { currentRequestContext } from "./requestContext";
import { checkLoginRateLimit, checkSignupRateLimit } from "./ratelimit";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "frontdesk_session";
const SESSION_DAYS = 30;

export interface Account {
  id: string;
  email: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  plan: string;
}

export function normaliseEmail(value: string) { return value.trim().toLowerCase(); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function validSlug(value: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
export function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug || "business";
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, salt, hex] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  try {
    const expected = Buffer.from(hex, "hex");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

function cookieOptions() { return { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/", maxAge: SESSION_DAYS * 86400 }; }

export async function createSession(accountId: string) {
  await store.ensureSchema();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await store.query("INSERT INTO sessions (token, account_id, expires_at) VALUES ($1, $2, $3)", [token, accountId, expires]);
  setCookie(SESSION_COOKIE, token, cookieOptions());
}

export async function destroySession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) await store.query("DELETE FROM sessions WHERE token = $1", [token]);
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function currentAccount(): Promise<Account | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  await store.ensureSchema();
  const rows = await store.query(`SELECT a.id, a.email, b.id AS business_id, b.name AS business_name, b.slug AS business_slug, b.plan
    FROM sessions s JOIN accounts a ON a.id = s.account_id JOIN businesses b ON b.id = a.business_id
    WHERE s.token = $1 AND s.expires_at > now()`, [token]);
  const row = rows[0];
  if (!row) return null;
  return { id: String(row.id), email: String(row.email), businessId: String(row.business_id), businessName: String(row.business_name), businessSlug: String(row.business_slug), plan: String(row.plan ?? "free") };
}

export async function signup(email: string, password: string, businessName: string, signupSource?: string | null): Promise<{ ok: boolean; error?: string; account?: Account }> {
  const { ip, userAgent } = currentRequestContext();
  const { blocked } = await checkSignupRateLimit(ip);
  if (blocked) {
    void store.logSecurityEvent({ eventType: "signup_blocked", severity: "critical", ip, userAgent });
    return { ok: false, error: "Too many signups from this network. Try again later." };
  }
  email = normaliseEmail(email);
  businessName = businessName.trim().slice(0, 120);
  signupSource = signupSource?.trim().slice(0, 120) || null;
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (businessName.length < 2) return { ok: false, error: "Enter a business name." };
  await store.ensureSchema();
  const slugBase = slugify(businessName);
  const slugRows = await store.query("SELECT slug FROM businesses WHERE slug LIKE $1 ORDER BY slug DESC LIMIT 1", [`${slugBase}%`]);
  let slug = slugBase;
  if (slugRows[0]) slug = `${slugBase}-${Date.now().toString(36).slice(-5)}`;
  const businessId = randomUUID();
  const accountId = randomUUID();
  try {
    await store.query("INSERT INTO businesses (id, name, slug, signup_source) VALUES ($1, $2, $3, $4)", [businessId, businessName, slug, signupSource]);
    const hash = await hashPassword(password);
    await store.query("INSERT INTO accounts (id, email, password_hash, business_id) VALUES ($1, $2, $3, $4)", [accountId, email, hash, businessId]);
    const account = { id: accountId, email, businessId, businessName, businessSlug: slug, plan: "free" };
    await createSession(accountId);
    return { ok: true, account };
  } catch (error) {
    await store.query("DELETE FROM accounts WHERE id = $1", [accountId]).catch(() => {});
    await store.query("DELETE FROM businesses WHERE id = $1", [businessId]).catch(() => {});
    const message = String(error).includes("accounts_email_key") ? "That email is already registered." : String(error).includes("businesses_slug_key") ? "That business name is already in use." : "Could not create the account.";
    return { ok: false, error: message };
  }
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string; account?: Account }> {
  const { ip, userAgent } = currentRequestContext();
  email = normaliseEmail(email);
  const { blocked } = await checkLoginRateLimit(ip);
  if (blocked) {
    void store.logSecurityEvent({ eventType: "login_blocked", severity: "critical", ip, userAgent, actorEmail: email });
    return { ok: false, error: "Too many attempts from this network. Try again later." };
  }
  await store.ensureSchema();
  const rows = await store.query(`SELECT a.id, a.email, a.password_hash, b.id AS business_id, b.name AS business_name, b.slug AS business_slug, b.plan FROM accounts a JOIN businesses b ON b.id = a.business_id WHERE a.email = $1`, [email]);
  const row = rows[0];
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    void store.logSecurityEvent({
      eventType: "login_failed",
      severity: "warning",
      ip,
      userAgent,
      actorEmail: email,
      businessId: row ? String(row.business_id) : null,
    });
    return { ok: false, error: "Email or password is incorrect." };
  }
  const account = { id: String(row.id), email: String(row.email), businessId: String(row.business_id), businessName: String(row.business_name), businessSlug: String(row.business_slug), plan: String(row.plan ?? "free") };
  await createSession(account.id);
  return { ok: true, account };
}
