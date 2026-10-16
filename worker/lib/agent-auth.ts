import type { Context, Next } from "hono";
import type { AgentToken } from "../../src/lib/types";
import type { Actor } from "../services/authoring";
import { errorResponse } from "./http";

/**
 * Agent tokens authenticate the teacher's AI agents on `/api/mcp`. Each token is
 * 32 random bytes with a `pai_agent_` prefix. They are high-entropy secrets, so a
 * plain SHA-256 hash is sufficient; only the hash is stored.
 */

export const AGENT_TOKEN_PREFIX = "pai_agent_";
const encoder = new TextEncoder();

export type AgentTokenSummary = AgentToken;

interface AgentTokenRow extends Record<string, unknown> {
  id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function toSummary(row: AgentTokenRow): AgentTokenSummary {
  return { id: row.id, name: row.name, createdAt: row.created_at, lastUsedAt: row.last_used_at, revokedAt: row.revoked_at };
}

function base64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function hashAgentToken(token: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}

export function generateAgentToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${AGENT_TOKEN_PREFIX}${base64Url(bytes)}`;
}

export async function listAgentTokens(db: D1Database): Promise<AgentTokenSummary[]> {
  const result = await db.prepare("SELECT id, name, created_at, last_used_at, revoked_at FROM agent_tokens ORDER BY revoked_at IS NOT NULL, created_at DESC, id DESC").all<AgentTokenRow>();
  return result.results.map(toSummary);
}

/** Returns the plaintext token exactly once, or null when the name is taken. */
export async function createAgentToken(db: D1Database, name: string): Promise<{ token: string; agent: AgentTokenSummary } | null> {
  const token = generateAgentToken();
  try {
    const row = await db.prepare("INSERT INTO agent_tokens (name, token_hash) VALUES (?, ?) RETURNING id, name, created_at, last_used_at, revoked_at")
      .bind(name, await hashAgentToken(token)).first<AgentTokenRow>();
    return { token, agent: toSummary(row!) };
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) return null;
    throw error;
  }
}

export async function revokeAgentToken(db: D1Database, id: number): Promise<AgentTokenSummary | null> {
  await db.prepare("UPDATE agent_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE id = ?").bind(id).run();
  const row = await db.prepare("SELECT id, name, created_at, last_used_at, revoked_at FROM agent_tokens WHERE id = ?").bind(id).first<AgentTokenRow>();
  return row ? toSummary(row) : null;
}

export async function findActiveAgent(db: D1Database, token: string): Promise<Actor | null> {
  if (!token.startsWith(AGENT_TOKEN_PREFIX) || token.length > 200) return null;
  const row = await db.prepare("SELECT id, name FROM agent_tokens WHERE token_hash = ? AND revoked_at IS NULL")
    .bind(await hashAgentToken(token)).first<{ id: number; name: string }>();
  if (!row) return null;
  await db.prepare("UPDATE agent_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.id).run();
  return { type: "agent", id: row.id, name: row.name };
}

/**
 * Hono middleware for agent-only routes. It reads only the Authorization
 * header; browser session cookies are never consulted on these routes.
 */
export async function requireAgent(c: Context<{ Bindings: Cloudflare.Env; Variables: { agent: Actor } }>, next: Next) {
  const header = c.req.header("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match || !c.env?.DB) return unauthorized(c);
  const agent = await findActiveAgent(c.env.DB, match[1]);
  if (!agent) return unauthorized(c);
  c.set("agent", agent);
  return next();
}

function unauthorized(c: Context) {
  const response = errorResponse(c, 401, "AGENT_AUTH_REQUIRED", "A valid agent token is required");
  response.headers.set("WWW-Authenticate", 'Bearer realm="pai-mcp"');
  return response;
}
