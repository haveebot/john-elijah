import { listAllProducts } from "@/lib/db/commerce";
import { stripeEnabled } from "@/lib/stripe";
import { actionUpsertProduct, actionSetProductStatus, actionSetVariantInventory } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqProducts() {
  const products = await listAllProducts();

  return (
    <div className="max-w-4xl">
      <p className="label">Merch</p>
      <h1 className="wordmark mt-2 text-4xl">Catalog · {products.length}</h1>
      <p className="mt-2 text-sm text-ink-dim">
        {stripeEnabled() ? "Stripe is connected — live products are purchasable." : "Stripe isn't connected yet — live products show a notify-me button until it is."}
      </p>

      <form action={actionUpsertProduct} className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 md:grid-cols-4">
        <p className="label col-span-full">Add / update a product (upserts by slug)</p>
        <input name="title" required placeholder="Title" className="field" />
        <input name="slug" required placeholder="slug" className="field" />
        <input name="price_dollars" type="number" min="0" step="1" required placeholder="Price $" className="field" />
        <input name="weight_oz" type="number" min="1" step="0.5" placeholder="Weight oz (8)" className="field" />
        <select name="kind" className="field" defaultValue="apparel">
          {["apparel", "music", "accessory"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input name="variants" placeholder="Variants: S, M, L, XL (or 'One size')" className="field md:col-span-3" />
        <textarea name="description" placeholder="Description" rows={2} className="field col-span-full" />
        <button type="submit" className="btn btn-brass btn-sm justify-self-start">Save product</button>
      </form>

      <div className="mt-8 space-y-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="wordmark text-2xl">{p.title} <span className="label ml-2">/{p.slug} · ${(p.price_cents / 100).toFixed(0)} · {p.kind}</span></p>
              <form action={actionSetProductStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <select name="status" defaultValue={p.status} className="field py-1 text-xs">
                  {["draft", "live", "sold_out", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button type="submit" className="btn btn-ghost btn-sm">Set</button>
              </form>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.variants ?? []).map((v) => (
                <form key={v.id} action={actionSetVariantInventory} className="flex items-center gap-1 rounded border border-canvas-edge px-2 py-1 text-xs">
                  <input type="hidden" name="id" value={v.id} />
                  <span className="text-ink-dim">{v.label}</span>
                  <input name="inventory" type="number" min="0" defaultValue={v.inventory} className="field w-16 py-0.5 text-xs" />
                  <button type="submit" className="text-brass">✓</button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
