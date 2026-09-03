/**
 * Commerce — products, variants, orders, shipments. Stripe archetype:
 * catalog + inventory live here; Checkout + payment live on Stripe; the
 * webhook writes orders and decrements stock. Shippo labels attach to
 * orders as `shipments` rows.
 */

import { query, queryOne } from "./client";

export type Variant = {
  id: number;
  product_id: number;
  label: string;
  sku: string | null;
  inventory: number;
  stripe_price_id: string | null;
  sort: number;
};

export type Product = {
  id: number;
  kind: string;
  title: string;
  slug: string;
  description: string;
  price_cents: number;
  weight_oz: string | number;
  status: string;
  hero_url?: string | null;
  stripe_product_id: string | null;
  variants?: Variant[];
};

export type Order = {
  id: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  email: string;
  name: string;
  shipping: unknown;
  amount_cents: number;
  status: string;
  created_at: string;
  weight_oz?: number;
};

export type Shipment = {
  id: number;
  order_id: number;
  shippo_shipment_id: string | null;
  shippo_rate_id: string | null;
  shippo_transaction_id: string | null;
  carrier: string;
  service: string;
  cost_cents: number;
  tracking_number: string | null;
  tracking_url: string | null;
  label_url: string | null;
  status: string;
  created_at: string;
};

const PRODUCT_SELECT = `
  SELECT p.*, a.blob_url AS hero_url
  FROM products p LEFT JOIN assets a ON a.id = p.hero_asset_id`;

export async function listLiveProducts(): Promise<Product[]> {
  const products = await query<Product>(
    `${PRODUCT_SELECT} WHERE p.status IN ('live','sold_out') ORDER BY p.status = 'live' DESC, p.updated_at DESC`,
  );
  return attachVariants(products);
}

export async function listAllProducts(): Promise<Product[]> {
  const products = await query<Product>(`${PRODUCT_SELECT} ORDER BY p.updated_at DESC`);
  return attachVariants(products);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const product = await queryOne<Product>(`${PRODUCT_SELECT} WHERE p.slug = $1`, [slug]);
  if (!product) return null;
  const [withVariants] = await attachVariants([product]);
  return withVariants;
}

async function attachVariants(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products;
  const ids = products.map((p) => p.id);
  const variants = await query<Variant>(
    `SELECT * FROM variants WHERE product_id = ANY($1) ORDER BY sort, id`,
    [ids],
  );
  const byProduct = new Map<number, Variant[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push(v);
    byProduct.set(v.product_id, list);
  }
  return products.map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] }));
}

export async function upsertProduct(
  p: Partial<Product> & { title: string; slug: string },
  variantLabels?: { label: string; inventory?: number; sort?: number }[],
): Promise<Product> {
  const rows = await query<Product>(
    `INSERT INTO products (kind, title, slug, description, price_cents, weight_oz, status)
     VALUES (COALESCE($1,'apparel'),$2,$3,COALESCE($4,''),COALESCE($5,0),COALESCE($6,8),COALESCE($7,'draft'))
     ON CONFLICT (slug) DO UPDATE SET
       kind=EXCLUDED.kind, title=EXCLUDED.title, description=EXCLUDED.description,
       price_cents=EXCLUDED.price_cents, weight_oz=EXCLUDED.weight_oz, updated_at=now()
     RETURNING *`,
    [p.kind, p.title, p.slug, p.description, p.price_cents, p.weight_oz ?? null, p.status],
  );
  const product = rows[0];
  if (variantLabels) {
    for (const v of variantLabels) {
      await query(
        `INSERT INTO variants (product_id, label, inventory, sort)
         VALUES ($1,$2,COALESCE($3,0),COALESCE($4,100))
         ON CONFLICT (product_id, label) DO UPDATE SET sort=EXCLUDED.sort`,
        [product.id, v.label, v.inventory, v.sort],
      );
    }
  }
  return product;
}

export async function getVariant(id: number): Promise<(Variant & { product: Product }) | null> {
  const variant = await queryOne<Variant>(`SELECT * FROM variants WHERE id = $1`, [id]);
  if (!variant) return null;
  const product = await queryOne<Product>(`${PRODUCT_SELECT} WHERE p.id = $1`, [variant.product_id]);
  if (!product) return null;
  return { ...variant, product };
}

/** Webhook path: record the order + decrement inventory. Idempotent per session id. */
export async function recordOrder(input: {
  stripe_session_id: string;
  stripe_payment_intent?: string | null;
  email: string;
  name: string;
  shipping?: unknown;
  amount_cents: number;
  items: { variant_id: number | null; qty: number; unit_cents: number }[];
}): Promise<Order | null> {
  const existing = await queryOne<Order>(`SELECT * FROM orders WHERE stripe_session_id = $1`, [input.stripe_session_id]);
  if (existing) return existing; // webhook retry — already recorded

  const rows = await query<Order>(
    `INSERT INTO orders (stripe_session_id, stripe_payment_intent, email, name, shipping, amount_cents)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      input.stripe_session_id,
      input.stripe_payment_intent ?? null,
      input.email,
      input.name,
      input.shipping ? JSON.stringify(input.shipping) : null,
      input.amount_cents,
    ],
  );
  const order = rows[0];
  for (const item of input.items) {
    await query(`INSERT INTO order_items (order_id, variant_id, qty, unit_cents) VALUES ($1,$2,$3,$4)`, [
      order.id,
      item.variant_id,
      item.qty,
      item.unit_cents,
    ]);
    if (item.variant_id) {
      await query(`UPDATE variants SET inventory = GREATEST(0, inventory - $2) WHERE id = $1`, [item.variant_id, item.qty]);
    }
  }
  return order;
}

export async function listOrders(): Promise<Order[]> {
  return query<Order>(`SELECT * FROM orders ORDER BY created_at DESC`);
}

/** Order + total parcel weight (sum of product weights × qty; default 8oz). */
export async function getOrder(id: number): Promise<Order | null> {
  const order = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (!order) return null;
  const w = await queryOne<{ oz: string | null }>(
    `SELECT SUM(COALESCE(p.weight_oz, 8) * oi.qty) AS oz
     FROM order_items oi
     LEFT JOIN variants v ON v.id = oi.variant_id
     LEFT JOIN products p ON p.id = v.product_id
     WHERE oi.order_id = $1`,
    [id],
  );
  return { ...order, weight_oz: Math.max(1, parseFloat(w?.oz ?? "8") || 8) };
}

export async function setOrderStatus(id: number, status: string): Promise<void> {
  await query(`UPDATE orders SET status = $2 WHERE id = $1`, [id, status]);
}

export async function listShipmentsForOrders(orderIds: number[]): Promise<Shipment[]> {
  if (orderIds.length === 0) return [];
  return query<Shipment>(`SELECT * FROM shipments WHERE order_id = ANY($1) ORDER BY created_at DESC`, [orderIds]);
}

export async function recordShipment(input: {
  order_id: number;
  shippo_shipment_id: string;
  shippo_rate_id: string;
  carrier: string;
  service: string;
  cost_cents: number;
}): Promise<Shipment> {
  const rows = await query<Shipment>(
    `INSERT INTO shipments (order_id, shippo_shipment_id, shippo_rate_id, carrier, service, cost_cents)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.order_id, input.shippo_shipment_id, input.shippo_rate_id, input.carrier, input.service, input.cost_cents],
  );
  return rows[0];
}

export async function markShipmentPurchased(
  id: number,
  patch: {
    shippo_transaction_id: string;
    status: string;
    tracking_number: string | null;
    tracking_url: string | null;
    label_url: string | null;
  },
): Promise<void> {
  await query(
    `UPDATE shipments SET shippo_transaction_id=$2, status=$3, tracking_number=$4, tracking_url=$5, label_url=$6 WHERE id=$1`,
    [id, patch.shippo_transaction_id, patch.status, patch.tracking_number, patch.tracking_url, patch.label_url],
  );
  if (patch.status === "purchased") {
    await query(
      `UPDATE orders SET status = 'fulfilled' WHERE id = (SELECT order_id FROM shipments WHERE id = $1) AND status = 'paid'`,
      [id],
    );
  }
}
