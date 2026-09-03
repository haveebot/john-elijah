import { listOrders, listShipmentsForOrders } from "@/lib/db/commerce";
import { shippoEnabled } from "@/lib/shippo";
import { actionSetOrderStatus, actionGetRates, actionBuyLabel } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqOrders({ searchParams }: { searchParams: Promise<{ rates?: string }> }) {
  const { rates: ratesRaw } = await searchParams;
  const orders = await listOrders();
  const shipments = await listShipmentsForOrders(orders.map((o) => o.id));
  // rates come back from actionGetRates via the URL (stateless, no extra table)
  let rates: { orderId: number; shipmentId: string; list: { id: string; label: string; amount: string; days: number | null }[] } | null = null;
  if (ratesRaw) {
    try { rates = JSON.parse(Buffer.from(ratesRaw, "base64url").toString("utf8")); } catch { rates = null; }
  }

  return (
    <div>
      <p className="label">Orders</p>
      <h1 className="wordmark mt-2 text-4xl">Stripe orders · {orders.length}</h1>
      <p className="mt-2 text-sm text-ink-dim">
        {shippoEnabled() ? "Shippo connected — get rates, buy the label, tracking lands on the order." : "Shippo isn't connected — set SHIPPO_API_KEY + SHIP_FROM_JSON and labels buy from here."}
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 max-w-xl text-ink-dim">No orders yet — they land here automatically once Stripe is connected and the first checkout completes.</p>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => {
            const ship = shipments.filter((s) => s.order_id === order.id);
            const purchased = ship.find((s) => s.status === "purchased");
            const shipping = (order.shipping ?? {}) as { name?: string; address?: Record<string, string> };
            const addr = shipping.address ? [shipping.address.line1, shipping.address.line2, `${shipping.address.city ?? ""} ${shipping.address.state ?? ""} ${shipping.address.postal_code ?? ""}`].filter(Boolean).join(", ") : "";
            return (
              <div key={order.id} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="wordmark text-2xl">#{order.id} · {order.name || order.email} <span className="label ml-2">${(order.amount_cents / 100).toFixed(2)} · {order.status} · {new Date(order.created_at).toLocaleString()}</span></p>
                  {order.status === "paid" ? (
                    <form action={actionSetOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="fulfilled" />
                      <button type="submit" className="btn btn-ghost btn-sm">Mark fulfilled</button>
                    </form>
                  ) : null}
                </div>
                {addr ? <p className="mt-2 text-sm text-ink-dim">{shipping.name} · {addr}</p> : null}

                {purchased ? (
                  <p className="mt-3 text-sm">
                    Label bought · {purchased.carrier} {purchased.service} · ${(purchased.cost_cents / 100).toFixed(2)} ·{" "}
                    {purchased.label_url ? <a href={purchased.label_url} target="_blank" rel="noopener noreferrer" className="brass-link text-brass">Print label</a> : null}
                    {purchased.tracking_url ? <> · <a href={purchased.tracking_url} target="_blank" rel="noopener noreferrer" className="brass-link">{purchased.tracking_number}</a></> : null}
                  </p>
                ) : shippoEnabled() && order.status === "paid" ? (
                  <div className="mt-3">
                    {rates && rates.orderId === order.id ? (
                      <div className="flex flex-wrap gap-2">
                        {rates.list.map((r) => (
                          <form key={r.id} action={actionBuyLabel}>
                            <input type="hidden" name="order_id" value={order.id} />
                            <input type="hidden" name="shipment_id" value={rates?.shipmentId} />
                            <input type="hidden" name="rate_id" value={r.id} />
                            <input type="hidden" name="label" value={r.label} />
                            <input type="hidden" name="amount" value={r.amount} />
                            <button type="submit" className="btn btn-ghost btn-sm">{r.label} · ${r.amount}{r.days ? ` · ${r.days}d` : ""}</button>
                          </form>
                        ))}
                      </div>
                    ) : (
                      <form action={actionGetRates}>
                        <input type="hidden" name="id" value={order.id} />
                        <button type="submit" className="btn btn-brass btn-sm">Get shipping rates</button>
                      </form>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
