/**
 * SHA-256 helpers (Web Crypto — Node + Edge). Agent tokens are hashed
 * at rest; 32 bytes of entropy makes a single unsalted hash sufficient.
 */

const encoder = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/** New agent token: `je_<64 hex>` — 32 bytes of entropy. */
export function generateAgentToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return `je_${hex}`;
}

/** Display prefix (first 13 chars: `je_` + 8 hex) for the HQ token list. */
export function tokenPrefix(token: string): string {
  return token.slice(0, 13);
}
