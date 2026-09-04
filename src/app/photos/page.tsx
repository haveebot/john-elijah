import Image from "next/image";
import { SiteNav, SiteFooter, SectionHeading } from "@/components/site-chrome";
import { listPublicAssets } from "@/lib/db/gallery";
import { SITE } from "@/lib/site";

export const revalidate = 3600;
export const metadata = { title: "Photos" };

export default async function PhotosPage() {
  const assets = await listPublicAssets(120);
  const credits = Array.from(new Set(assets.map((a) => a.credit).filter(Boolean)));

  return (
    <>
      <SiteNav />
      <main className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading label="Gallery" title="Photos" />
        </div>
        {assets.length === 0 ? (
          <p className="mx-auto max-w-6xl px-5 text-ink-dim">Photos are on the way.</p>
        ) : (
          <div className="columns-2 gap-1.5 px-1.5 md:columns-3 lg:columns-4">
            {assets.map((a) => {
              const w = a.width ?? 3;
              const h = a.height ?? 2;
              return (
                <a
                  key={a.id}
                  href={a.blob_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative mb-1.5 block overflow-hidden bg-canvas-raised"
                  style={{ aspectRatio: `${w} / ${h}` }}
                >
                  <Image
                    src={a.thumb_url || a.blob_url}
                    alt={a.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </a>
              );
            })}
          </div>
        )}
        <p className="label mx-auto mt-10 max-w-6xl px-5">
          Photography:{" "}
          {credits.length > 0 ? credits.map((c, i) => (
            <span key={c}>
              {i > 0 ? " · " : ""}
              {c === SITE.photographer.name ? (
                <a href={SITE.photographer.url} target="_blank" rel="noopener noreferrer" className="brass-link text-ink">{c} · {SITE.photographer.company}</a>
              ) : c}
            </span>
          )) : (
            <a href={SITE.photographer.url} target="_blank" rel="noopener noreferrer" className="brass-link text-ink">{SITE.photographer.name} · {SITE.photographer.company}</a>
          )}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
