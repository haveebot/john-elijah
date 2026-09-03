import { listAgentTokens } from "@/lib/db/agent-tokens";
import { listConfigurations, listTravelBands } from "@/lib/db/bookings";
import { STANDARD_HOURS, EXTRA_HOUR_PCT } from "@/lib/quote";
import { query } from "@/lib/db/client";
import { actionDeleteAgentToken, actionSetRate, actionSetTravelFee } from "../actions";
import { TokenCreator } from "./token-creator";

export const dynamic = "force-dynamic";

export default async function HqSettings() {
  const [tokens, configs, bands, subs] = await Promise.all([
    listAgentTokens(),
    listConfigurations(),
    listTravelBands(),
    query<{ email: string; source: string; created_at: string }>(
      `SELECT email, source, created_at FROM subscribers ORDER BY created_at DESC LIMIT 100`,
    ),
  ]);

  return (
    <div className="max-w-3xl">
      <p className="label">Settings</p>
      <h1 className="wordmark mt-2 text-4xl">Rate card, agents, the list</h1>

      <section className="mt-10">
        <h2 className="label mb-3">Rate card</h2>
        <p className="mb-4 max-w-xl text-sm text-ink-dim">
          Working numbers for a standard evening. They pre-fill the quote on every booking — the quote is always yours to change.
        </p>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {configs.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="wordmark text-lg">{c.label}</p>
                <p className="text-xs text-ink-dim">{c.lineup}{c.notes ? ` · ${c.notes}` : ""}</p>
              </div>
              <form action={actionSetRate} className="flex items-center gap-2">
                <input type="hidden" name="key" value={c.key} />
                <span className="label">$</span>
                <input name="dollars" type="number" min="0" step="25" defaultValue={c.base_cents / 100} className="field w-24 py-1 text-sm" />
                <button type="submit" className="btn btn-ghost btn-sm">Set</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="label mb-3">Travel bands</h2>
        <p className="mb-4 max-w-xl text-sm text-ink-dim">
          Flat fees by distance from Port Aransas, added to the working number on the booking page. A standard night is {STANDARD_HOURS} hours; each extra hour adds {Math.round(EXTRA_HOUR_PCT * 100)}% of the base. Placeholders until you and John set them.
        </p>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {bands.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-4 px-5 py-3">
              <p className="text-sm">{b.label}</p>
              <form action={actionSetTravelFee} className="flex items-center gap-2">
                <input type="hidden" name="key" value={b.key} />
                <span className="label">+$</span>
                <input name="dollars" type="number" min="0" step="25" defaultValue={b.fee_cents / 100} className="field w-24 py-1 text-sm" />
                <button type="submit" className="btn btn-ghost btn-sm">Set</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="label mb-3">Agent access</h2>
        <p className="mb-4 max-w-xl text-sm text-ink-dim">
          Bearer tokens for MCP agents at <code className="text-ink">/api/mcp</code>. The plaintext shows exactly once.
        </p>
        <TokenCreator />
        <ul className="setlist mt-5 rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="wordmark text-lg">{token.name}</p>
                <p className="label mt-1">
                  {token.token_prefix}… · created {new Date(token.created_at).toLocaleDateString()}
                  {token.last_used_at ? ` · last used ${new Date(token.last_used_at).toLocaleDateString()}` : " · never used"}
                </p>
              </div>
              <form action={actionDeleteAgentToken}>
                <input type="hidden" name="id" value={token.id} />
                <button type="submit" className="rounded-full border border-coral/60 px-3 py-1 text-xs text-coral hover:bg-coral hover:text-canvas">Revoke</button>
              </form>
            </li>
          ))}
          {tokens.length === 0 ? <li className="px-5 py-3 text-sm text-ink-faint">No tokens yet.</li> : null}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="label mb-3">The list · {subs.length}</h2>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {subs.map((sub) => (
            <li key={sub.email} className="flex items-baseline justify-between px-5 py-2.5 text-sm">
              <span>{sub.email}</span>
              <span className="label">{sub.source} · {new Date(sub.created_at).toLocaleDateString()}</span>
            </li>
          ))}
          {subs.length === 0 ? <li className="px-5 py-3 text-sm text-ink-faint">Empty — fills from the site.</li> : null}
        </ul>
      </section>
    </div>
  );
}
