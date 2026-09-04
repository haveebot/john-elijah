"use client";

import { useState } from "react";

type VariantOption = { id: number; label: string; inStock: boolean };

/**
 * Buy panel with a first-class no-keys mode: when Stripe isn't configured
 * (pre-launch) or the item is sold out, the panel becomes a notify-me form
 * instead of a dead button.
 */
export function BuyPanel({
  productSlug,
  status,
  purchasable,
  variants,
}: {
  productSlug: string;
  status: string;
  purchasable: boolean;
  variants: VariantOption[];
}) {
  const [variantId, setVariantId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function checkout() {
    if (!variantId) return;
    setState("busy");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId, product_slug: productSlug }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  }

  async function notify(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: `restock:${productSlug}` }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (purchasable) {
    return (
      <div className="mt-8">
        <p className="label mb-3">Size</p>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={!v.inStock}
              onClick={() => setVariantId(v.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                variantId === v.id
                  ? "border-brass bg-brass text-canvas"
                  : v.inStock
                    ? "border-canvas-edge text-ink-dim hover:border-ink-faint hover:text-ink"
                    : "cursor-not-allowed border-canvas-edge/40 text-ink-faint line-through"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={checkout}
          disabled={!variantId || state === "busy"}
          className="mt-6 w-full rounded-full bg-brass px-7 py-3 font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
        >
          {state === "busy" ? "Heading to checkout…" : "Buy it"}
        </button>
        {state === "error" ? (
          <p className="mt-3 text-sm text-coral">Checkout hiccuped, try again.</p>
        ) : null}
      </div>
    );
  }

  if (state === "done") {
    return <p className="mt-8 text-brass">You'll be the first to know.</p>;
  }

  return (
    <div className="mt-8 rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
      <p className="wordmark text-xl">
        {status === "sold_out" ? "Sold out, for now." : "Not on sale right this second."}
      </p>
      <p className="mt-1 text-sm text-ink-dim">
        Leave an email and get first word when it's back.
      </p>
      <form onSubmit={notify} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-full border border-canvas-edge bg-canvas px-5 py-2.5 text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-full bg-brass px-6 py-2.5 font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "busy" ? "Adding…" : "Notify me"}
        </button>
      </form>
      {state === "error" ? (
        <p className="mt-3 text-sm text-coral">Something hiccuped, try again.</p>
      ) : null}
    </div>
  );
}
