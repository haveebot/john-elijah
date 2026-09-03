import { sha256Hex, generateAgentToken, tokenPrefix } from "@/lib/auth/hash";
import { query, queryOne } from "./client";

export type AgentToken = {
  id: number;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

export async function listAgentTokens(): Promise<AgentToken[]> {
  return query<AgentToken>(
    `SELECT id, name, token_prefix, created_at, last_used_at
     FROM agent_tokens ORDER BY created_at DESC`,
  );
}

/** Create a token; returns plaintext ONCE (stored hashed). */
export async function createAgentToken(name: string): Promise<{ token: string; row: AgentToken }> {
  const token = generateAgentToken();
  const hash = await sha256Hex(token);
  const rows = await query<AgentToken>(
    `INSERT INTO agent_tokens (name, token_hash, token_prefix)
     VALUES ($1, $2, $3)
     RETURNING id, name, token_prefix, created_at, last_used_at`,
    [name, hash, tokenPrefix(token)],
  );
  return { token, row: rows[0] };
}

export async function deleteAgentToken(id: number): Promise<void> {
  await query("DELETE FROM agent_tokens WHERE id = $1", [id]);
}

export async function verifyAgentToken(
  token: string,
): Promise<{ id: number; name: string } | null> {
  const hash = await sha256Hex(token);
  const row = await queryOne<{ id: number; name: string }>(
    `UPDATE agent_tokens SET last_used_at = now()
     WHERE token_hash = $1
     RETURNING id, name`,
    [hash],
  );
  return row;
}
