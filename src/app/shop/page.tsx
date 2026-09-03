import Link from "next/link";
import Image from "next/image";
import { SiteNav, SiteFooter, SectionHeading } from "@/components/site-chrome";
import { SubscribeForm } from "@/components/subscribe-form";
import { listLiveProducts } from "@/lib/db/commerce";

export const revalidate = 600;
export const metadata = { title: "Merch" };

export default async function ShopPage() {
  const products = await listLiveProducts();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <SectionHeading label="Merch" title="Shirts, hats, the record" />
        {products.length === 0 ? (
          <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-8 md:flex md:items-center md:justify-between md:gap-10">
            <div>
              <p className="script text-3xl text-brass">Restocking.</p>
              <p className="mt-2 max-w-md text-ink-dim">Shirts, hats, and CDs come and go with the shows. Leave an email and get first word.</p>
            </div>
            <SubscribeForm source="merch" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-canvas-edge/60 bg-canvas-raised transition-colors hover:border-brass/60"
              >
                {product.hero_url ? (
                  <div className="relative aspect-square w-full bg-canvas">
                    <Image src={product.hero_url} alt={product.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-canvas p-6">
                    <span className="wordmark text-center text-2xl text-ink-dim">{product.title}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 p-4">
                  <h3 className="wordmark text-lg leading-snug">{product.title}</h3>
                  <p className="shrink-0 text-sm text-ink-dim">
                    {product.status === "sold_out" ? "Sold out" : `$${(product.price_cents / 100).toFixed(0)}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
