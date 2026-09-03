/**
 * Shippo — labels + tracking by API (org-standard shipping pattern, same as
 * Palm Republic). First-class NO-KEYS MODE: without SHIPPO_API_KEY the HQ
 * Orders surface shows "connect Shippo" instead of rate buttons, and every
 * function here throws a clear error rather than reaching the network.
 *
 * Ship-from address comes from SHIP_FROM_JSON (a Shippo address object).
 */

const API = "https://api.goshippo.com";

export type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

export type ShippoRate = {
  object_id: string;
  provider: string;
  servicelevel: { name: string; token: string };
  amount: string;
  currency: string;
  estimated_days: number | null;
  duration_terms: string;
};

export function shippoEnabled(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY && process.env.SHIP_FROM_JSON);
}

export function shipFromAddress(): ShippoAddress {
  const raw = process.env.SHIP_FROM_JSON;
  if (!raw) throw new Error("SHIP_FROM_JSON not set.");
  return JSON.parse(raw) as ShippoAddress;
}

async function shippo<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) throw new Error("Shippo not configured (SHIPPO_API_KEY missing).");
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `ShippoToken ${key}`,
      "Content-Type": "application/json",
      "Shippo-API-Version": "2018-02-08",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { detail?: string };
  if (!res.ok) throw new Error(`Shippo ${res.status}: ${json.detail ?? JSON.stringify(json).slice(0, 200)}`);
  return json;
}

/** Stripe's collected shipping_details → Shippo address. */
export function stripeShippingToAddress(shipping: unknown, fallbackEmail = ""): ShippoAddress {
  const s = (shipping ?? {}) as {
    name?: string;
    phone?: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
  };
  const a = s.address ?? {};
  return {
    name: s.name ?? "",
    street1: a.line1 ?? "",
    street2: a.line2 ?? undefined,
    city: a.city ?? "",
    state: a.state ?? "",
    zip: a.postal_code ?? "",
    country: a.country ?? "US",
    phone: s.phone ?? undefined,
    email: fallbackEmail || undefined,
  };
}

/** Creates a shipment and returns the rate list (sorted cheapest first). */
export async function createShipment(input: {
  to: ShippoAddress;
  weightOz: number;
  dims?: { length: number; width: number; height: number }; // inches
}): Promise<{ shipmentId: string; rates: ShippoRate[] }> {
  const dims = input.dims ?? { length: 12, width: 9, height: 3 };
  const shipment = await shippo<{ object_id: string; rates: ShippoRate[] }>("/shipments/", {
    address_from: shipFromAddress(),
    address_to: input.to,
    parcels: [
      {
        length: String(dims.length),
        width: String(dims.width),
        height: String(dims.height),
        distance_unit: "in",
        weight: String(Math.max(1, input.weightOz)),
        mass_unit: "oz",
      },
    ],
    async: false,
  });
  const rates = [...(shipment.rates ?? [])].sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
  return { shipmentId: shipment.object_id, rates };
}

export type ShippoTransaction = {
  object_id: string;
  status: string;      // SUCCESS | ERROR | QUEUED
  tracking_number: string | null;
  tracking_url_provider: string | null;
  label_url: string | null;
  rate: string;
  messages?: { text: string }[];
};

/** Buys the label for a rate. Returns the transaction (label_url + tracking). */
export async function purchaseLabel(rateId: string): Promise<ShippoTransaction> {
  return shippo<ShippoTransaction>("/transactions/", {
    rate: rateId,
    label_file_type: "PDF_4x6",
    async: false,
  });
}
