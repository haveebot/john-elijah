import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { getProductBySlug, listLiveProducts } from "@/lib/db/commerce";
import { stripeEnabled } from "@/lib/stripe";
import { BuyPanel } from "./buy-panel";

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    const products = await listLiveProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status === "draft" || product.status === "archived") notFound();

  const purchasable =
    stripeEnabled() && product.status === "live" && (product.variants ?? []).some((v) => v.inventory > 0);

  return (
    <>
      <SiteNav />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-16 md:grid-cols-2">
        <div>
          {product.hero_url ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-canvas-edge/60 bg-canvas-raised">
              <Image src={product.hero_url} alt={product.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-canvas-edge/60 bg-canvas-raised p-8">
              <span className="wordmark text-center text-4xl text-ink-dim">{product.title}</span>
            </div>
          )}
        </div>
        <div>
          <Link href="/shop" className="label brass-link">← Merch</Link>
          <h1 className="wordmark mt-4 text-4xl leading-tight">{product.title}</h1>
          <p className="mt-3 text-xl text-ink-dim">${(product.price_cents / 100).toFixed(0)}</p>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-dim">{product.description}</p>
          <BuyPanel
            productSlug={product.slug}
            status={product.status}
            purchasable={purchasable}
            variants={(product.variants ?? []).map((v) => ({ id: v.id, label: v.label, inStock: v.inventory > 0 }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
