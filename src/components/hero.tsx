"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StageIdent } from "./stage-ident";
import { Wordmark, LoneStarBadge } from "./site-chrome";
import { SITE } from "@/lib/site";

/**
 * The homepage hero: photo → veil → the Stage Light ident (particles form
 * the wordmark) → copy block. When the ident is running, the HTML wordmark
 * goes visually-hidden (still in the DOM for SEO/a11y); when it can't run
 * (reduced motion, no WebGL) the HTML wordmark simply shows.
 */
export function Hero({ photo }: { photo: { url: string; alt: string } | null }) {
  const [identOn, setIdentOn] = useState(false);
  const onReady = useCallback((r: boolean) => setIdentOn(r), []);

  return (
    <section className="relative flex min-h-[94vh] flex-col justify-end overflow-hidden">
      {photo ? (
        <Image src={photo.url} alt={photo.alt} fill priority sizes="100vw" className="hero-drift object-cover object-center" />
      ) : (
        <div className="absolute inset-0 bg-canvas-raised" aria-hidden />
      )}
      <div className="stage-veil absolute inset-0" aria-hidden />
      <div className="absolute inset-0 bg-canvas/35" aria-hidden />

      {/* the ident lives in the upper ~70% of the frame */}
      <div className="absolute inset-x-0 top-0 h-[72%]">
        <StageIdent onReady={onReady} />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-40 md:pb-20">
        <p className="script text-3xl text-brass md:text-5xl">Blues &amp; soul, live</p>
        <h1 className={identOn ? "sr-only" : "mt-2"}>
          <Wordmark size="xl" />
        </h1>
        <LoneStarBadge size="lg" className="mt-5" />
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-dim">
          Originals rooted in blues and soul, out of {SITE.origin}. Full band to solo acoustic — anywhere in Texas.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/book" className="btn btn-brass">Book the band</Link>
          <Link href="/shows" className="brass-link text-sm text-ink hover:text-ink">Next shows →</Link>
        </div>
      </div>
    </section>
  );
}
