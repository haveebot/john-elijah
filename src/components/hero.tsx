"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PrintIn } from "./print-in";
import { Wordmark, LoneStarBadge } from "./site-chrome";
import { SITE } from "@/lib/site";

/**
 * The homepage hero: the photo, then the Print-In runs over it (the photo
 * becomes a screen-print pulling itself), then the type stamps down.
 * With reduced motion or no WebGL the plain photo + type simply show.
 */
export function Hero({ photo }: { photo: { url: string; alt: string } | null }) {
  const [phase, setPhase] = useState<"idle" | "printing" | "settled">("idle");
  const onPhase = useCallback((p: "printing" | "settled") => setPhase(p), []);
  const stamp = phase === "idle" ? "" : phase === "printing" ? "stamp-wait" : "stamp-in";

  return (
    <section className="relative flex min-h-[94vh] flex-col justify-end overflow-hidden bg-canvas">
      {photo ? (
        <>
          <Image src={photo.url} alt={photo.alt} fill priority sizes="100vw" className="object-cover object-center" />
          <PrintIn src={photo.url} onPhase={onPhase} />
        </>
      ) : (
        <div className="absolute inset-0 bg-canvas-raised" aria-hidden />
      )}
      <div className="stage-veil absolute inset-0" aria-hidden />

      <div className={`relative mx-auto w-full max-w-6xl px-5 pb-14 pt-40 md:pb-20 ${stamp}`}>
        <p className="script stamp-line text-3xl text-brass md:text-5xl">Blues &amp; soul, live</p>
        <h1 className="stamp-title mt-2">
          <Wordmark size="xl" />
        </h1>
        <div className="stamp-line">
          <LoneStarBadge size="lg" className="mt-5" />
        </div>
        <p className="stamp-line mt-4 max-w-xl text-lg leading-relaxed text-ink-dim">
          Originals rooted in blues and soul, out of {SITE.origin}. Full band to solo acoustic — anywhere in Texas.
        </p>
        <div className="stamp-line mt-8 flex flex-wrap items-center gap-4">
          <Link href="/book" className="btn btn-brass">Book the band</Link>
          <Link href="/shows" className="brass-link text-sm text-ink hover:text-ink">Next shows →</Link>
        </div>
      </div>
    </section>
  );
}
