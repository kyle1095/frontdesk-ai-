/**
 * Persistence for conversations, messages, leads and tickets.
 *
 * Design rules:
 *  - This module is SERVER-ONLY. It reads `process.env.DATABASE_URL` (never a
 *    .env file) and is only ever imported from a `createServerFn` handler.
 *  - Nothing here throws at the caller for a missing/broken database: every
 *    write returns `{ ok: false, error }` so the conversation engine can tell the
 *    customer the truth ("I couldn't file that ticket") instead of inventing a
 *    reference number.
 *  - Two drivers, picked from the connection string: the team's Neon HTTP helper
 *    (`~/db`) for Neon, and a plain TCP Postgres client for any other Postgres
 *    (e.g. Tiger Cloud / Timescale), which the Neon HTTP driver cannot talk to.
 *
 * Schema is created on first use (`CREATE TABLE IF NOT EXISTS`), so publishing
 * before the database exists is safe.
 */

import { sql as neonSql } from "~/db";

export type Row = Record<string, unknown>;

export interface StorageStatus {
  configured: boolean;
  reachable: boolean;
  driver: "neon-http" | "tcp" | "none";
  error?: string;
}

export interface LeadInput {
  businessId: string;
  conversationId?: string | null;
  name: string;
  email: string;
  company: string;
  need: string;
  slotLabel?: string | null;
  slotStartsAt?: string | null;
}

export interface TicketInput {
  businessId: string;
  conversationId?: string | null;
  subject: string;
  whatDoing: string;
  whatHappened: string;
  urgency: string;
}

export interface LeadRecord extends LeadInput {
  id: number;
  status: string;
  createdAt: string;
}

export interface TicketRecord extends TicketInput {
  id: number;
  reference: string;
  status: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationSearchResult extends ConversationSummary {
  matchedBody: string;
}

export type TicketStatus = "new" | "in_progress" | "resolved";

export interface ConversationTranscript extends ConversationSummary {
  messages: { role: string; body: string; createdAt: string }[];
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function isNeonUrl(url: string): boolean {
  return /neon\.(tech|build|com)|neondb|\bneon\b/i.test(url);
}

let tcpClient: {
  unsafe: (text: string, params?: unknown[]) => Promise<unknown[]>;
} | null = null;

async function tcp(url: string) {
  if (!tcpClient) {
    // Dynamic import so a Neon deployment never needs this module loaded.
    const mod = (await import("postgres")) as unknown as {
      default: (u: string, o?: unknown) => typeof tcpClient;
    };
    tcpClient = mod.default(url, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: url.includes("sslmode=disable") ? false : "prefer",
    });
  }
  return tcpClient!;
}

export function driverKind(): StorageStatus["driver"] {
  const url = process.env.DATABASE_URL;
  if (!url) return "none";
  return isNeonUrl(url) ? "neon-http" : "tcp";
}

const QUERY_TIMEOUT_MS = 5_000;

/** Parameterised query. Throws on failure — callers decide how to degrade. */
export async function query(
  text: string,
  params: unknown[] = [],
): Promise<Row[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const run = async (): Promise<Row[]> => {
    if (isNeonUrl(url)) {
      const q = neonSql() as unknown as {
        query: (t: string, p?: unknown[]) => Promise<Row[]>;
      };
      return (await q.query(text, params)) as Row[];
    }
    const client = await tcp(url);
    return (await client.unsafe(text, params)) as Row[];
  };

  // A broken or stale connection must not make FAQ replies spin forever. The
  // widget can still answer from the local KB and truthfully report that writes
  // were not saved; a healthy database continues to use the same path.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<Row[]>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`Database query timed out after ${QUERY_TIMEOUT_MS}ms`),
            ),
          QUERY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS businesses (
     id text PRIMARY KEY,
     name text NOT NULL,
     slug text UNIQUE NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS accounts (
     id text PRIMARY KEY,
     email text UNIQUE NOT NULL,
     password_hash text NOT NULL,
     business_id text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token text PRIMARY KEY,
     account_id text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     expires_at timestamptz NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `INSERT INTO businesses (id, name, slug)
   VALUES ('cadence', 'Cadence', 'cadence')
   ON CONFLICT (slug) DO NOTHING`,
  `INSERT INTO accounts (id, email, password_hash, business_id)
   VALUES ('cadence-demo-account', 'demo@cadence.example', 'scrypt:frontdesk-demo-salt-2026:6719ba12d9992eb3789f7bbec4d4ba98e30527f089ac2df59be3bd6eaa681dab22c19ca9f10be28093d6679e552795f87ff9c7c9f390fda9b6083ccc9d401afb', 'cadence')
   ON CONFLICT (email) DO NOTHING`,
  `CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions (account_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at)`,
  `CREATE TABLE IF NOT EXISTS conversations (
     id text PRIMARY KEY,
     business_id text NOT NULL,
     channel text NOT NULL DEFAULT 'widget',
     state jsonb NOT NULL DEFAULT '{}'::jsonb,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS messages (
     id bigserial PRIMARY KEY,
     conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
     role text NOT NULL,
     body text NOT NULL,
     meta jsonb,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS leads (
     id bigserial PRIMARY KEY,
     business_id text NOT NULL,
     conversation_id text,
     name text NOT NULL,
     email text NOT NULL,
     company text NOT NULL,
     need text NOT NULL,
     slot_label text,
     slot_starts_at timestamptz,
     status text NOT NULL DEFAULT 'new',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS tickets (
     id bigserial PRIMARY KEY,
     reference text UNIQUE NOT NULL,
     business_id text NOT NULL,
     conversation_id text,
     subject text NOT NULL,
     what_doing text NOT NULL,
     what_happened text NOT NULL,
     urgency text NOT NULL,
     status text NOT NULL DEFAULT 'new',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  // Migration for databases created before ticket statuses were added. Keep
  // this idempotent so every request can safely run the schema bootstrap.
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new'`,
  `ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'new'`,
  `UPDATE tickets SET status = 'new' WHERE status = 'open'`,
  `CREATE SEQUENCE IF NOT EXISTS ticket_reference_seq START WITH 1042`,
  `CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, id)`,
];

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of SCHEMA) await query(statement);
    })().catch((err) => {
      schemaReady = null; // let the next request retry
      throw err;
    });
  }
  return schemaReady;
}

/** Non-throwing health check used by the widget UI and the operator page. */
export async function storageStatus(): Promise<StorageStatus> {
  const driver = driverKind();
  if (driver === "none") {
    return {
      configured: false,
      reachable: false,
      driver,
      error: "DATABASE_URL is not set",
    };
  }
  try {
    await ensureSchema();
    return { configured: true, reachable: true, driver };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      driver,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value == null ? "" : String(value);
}

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

export async function resolveBusinessId(value: string): Promise<string | null> {
  await ensureSchema();
  const key = value.trim().toLowerCase();
  if (!key) return null;
  const rows = await query(
    `SELECT id FROM businesses WHERE id = $1 OR slug = $1 LIMIT 1`,
    [key],
  );
  return rows[0]?.id == null ? null : toText(rows[0].id);
}

export async function createConversation(
  businessId: string,
  initialState: unknown,
): Promise<string> {
  await ensureSchema();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO conversations (id, business_id, state) VALUES ($1, $2, $3::jsonb)`,
    [id, businessId, initialState ?? {}],
  );
  return id;
}

export async function saveConversationState(
  id: string,
  state: unknown,
): Promise<void> {
  await ensureSchema();
  await query(
    `UPDATE conversations SET state = $2::jsonb, updated_at = now() WHERE id = $1`,
    [id, state ?? {}],
  );
}

export async function loadConversationState(
  id: string,
): Promise<{ state: unknown; businessId: string } | null> {
  await ensureSchema();
  const rows = await query(
    `SELECT state, business_id FROM conversations WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return { state: row.state, businessId: toText(row.business_id) };
}

export async function appendMessage(
  conversationId: string | null,
  role: "user" | "agent" | "system",
  body: string,
  meta?: unknown,
): Promise<void> {
  if (!conversationId) return;
  await ensureSchema();
  await query(
    `INSERT INTO messages (conversation_id, role, body, meta) VALUES ($1, $2, $3, $4::jsonb)`,
    [conversationId, role, body, meta ?? null],
  );
  await query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [
    conversationId,
  ]);
}

export async function createLead(
  input: LeadInput,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    await ensureSchema();
    const rows = await query(
      `INSERT INTO leads (business_id, conversation_id, name, email, company, need, slot_label, slot_starts_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
       RETURNING id`,
      [
        input.businessId,
        input.conversationId ?? null,
        input.name,
        input.email,
        input.company,
        input.need,
        input.slotLabel ?? null,
        input.slotStartsAt ?? null,
      ],
    );
    return { ok: true, id: Number(rows[0]?.id) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function createTicket(
  input: TicketInput,
): Promise<{ ok: boolean; reference?: string; id?: number; error?: string }> {
  try {
    await ensureSchema();
    const seq = await query(`SELECT nextval('ticket_reference_seq') AS n`);
    const reference = `CAD-${Number(seq[0]?.n)}`;
    const rows = await query(
      `INSERT INTO tickets (reference, business_id, conversation_id, subject, what_doing, what_happened, urgency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        reference,
        input.businessId,
        input.conversationId ?? null,
        input.subject,
        input.whatDoing,
        input.whatHappened,
        input.urgency,
      ],
    );
    return { ok: true, reference, id: Number(rows[0]?.id) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function listLeads(
  businessId: string,
  limit = 50,
): Promise<LeadRecord[]> {
  await ensureSchema();
  const rows = await query(
    `SELECT id, business_id, conversation_id, name, email, company, need, slot_label, slot_starts_at, status, created_at
     FROM leads WHERE business_id = $1 ORDER BY id DESC LIMIT $2`,
    [businessId, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    businessId: toText(r.business_id),
    conversationId: r.conversation_id ? toText(r.conversation_id) : null,
    name: toText(r.name),
    email: toText(r.email),
    company: toText(r.company),
    need: toText(r.need),
    slotLabel: r.slot_label ? toText(r.slot_label) : null,
    slotStartsAt: r.slot_starts_at ? iso(r.slot_starts_at) : null,
    status: toText(r.status),
    createdAt: iso(r.created_at),
  }));
}

export async function listTickets(
  businessId: string,
  limit = 50,
): Promise<TicketRecord[]> {
  await ensureSchema();
  const rows = await query(
    `SELECT id, reference, business_id, conversation_id, subject, what_doing, what_happened, urgency, status, created_at
     FROM tickets WHERE business_id = $1 ORDER BY id DESC LIMIT $2`,
    [businessId, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    reference: toText(r.reference),
    businessId: toText(r.business_id),
    conversationId: r.conversation_id ? toText(r.conversation_id) : null,
    subject: toText(r.subject),
    whatDoing: toText(r.what_doing),
    whatHappened: toText(r.what_happened),
    urgency: toText(r.urgency),
    status: toText(r.status),
    createdAt: iso(r.created_at),
  }));
}

const TICKET_STATUSES: TicketStatus[] = ["new", "in_progress", "resolved"];

export function isTicketStatus(value: string): value is TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus);
}

export async function updateTicketStatus(
  id: number,
  status: TicketStatus,
  businessId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isTicketStatus(status))
    return { ok: false, error: "Invalid ticket status." };
  try {
    await ensureSchema();
    const rows = await query(
      `UPDATE tickets SET status = $2 WHERE id = $1 AND business_id = $3 RETURNING id`,
      [id, status, businessId],
    );
    return rows.length
      ? { ok: true }
      : { ok: false, error: "Ticket not found." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function searchConversations(
  businessId: string,
  queryText: string,
  limit = 30,
): Promise<ConversationSearchResult[]> {
  await ensureSchema();
  const term = queryText.trim().slice(0, 200);
  if (!term) return [];
  const rows = await query(
    `SELECT c.id, c.business_id, c.created_at, c.updated_at,
            (SELECT count(*) FROM messages all_messages WHERE all_messages.conversation_id = c.id) AS message_count,
            (SELECT matched.body FROM messages matched
             WHERE matched.conversation_id = c.id AND matched.body ILIKE '%' || $2 || '%'
             ORDER BY matched.id ASC LIMIT 1) AS matched_body
     FROM conversations c
     WHERE c.business_id = $1 AND EXISTS (
     SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.body ILIKE '%' || $2 || '%'
     )
     ORDER BY c.updated_at DESC LIMIT $3`,
     [businessId, term, limit],
  );
  return rows.map((r) => ({
    id: toText(r.id),
    businessId: toText(r.business_id),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    messageCount: Number(r.message_count ?? 0),
    matchedBody: toText(r.matched_body),
  }));
}

export async function listConversations(
  businessId: string,
  limit = 30,
): Promise<ConversationSummary[]> {
  await ensureSchema();
  const rows = await query(
    `SELECT c.id, c.business_id, c.created_at, c.updated_at,
            (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
     FROM conversations c WHERE c.business_id = $1 ORDER BY c.updated_at DESC LIMIT $2`,
    [businessId, limit],
  );
  return rows.map((r) => ({
    id: toText(r.id),
    businessId: toText(r.business_id),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    messageCount: Number(r.message_count ?? 0),
  }));
}

export async function getTranscript(
  id: string,
  businessId: string,
): Promise<ConversationTranscript | null> {
  await ensureSchema();
  const rows = await query(
    `SELECT id, business_id, created_at, updated_at FROM conversations WHERE id = $1 AND business_id = $2`,
    [id, businessId],
  );
  const row = rows[0];
  if (!row) return null;
  const msgs = await query(
    `SELECT role, body, created_at FROM messages WHERE conversation_id = $1 ORDER BY id ASC LIMIT 500`,
    [id],
  );
  return {
    id: toText(row.id),
    businessId: toText(row.business_id),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    messageCount: msgs.length,
    messages: msgs.map((m) => ({
      role: toText(m.role),
      body: toText(m.body),
      createdAt: iso(m.created_at),
    })),
  };
}
