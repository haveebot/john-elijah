"use client";

import { useState } from "react";

/**
 * Click-to-load YouTube. Renders the poster (YouTube's own CDN thumbnail)
 * and swaps in the iframe only on tap — zero third-party JS on page load.
 */
export function VideoEmbed({ youtubeId, title, priority = false }: { youtubeId: string; title: string; priority?: boolean }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-canvas">
        <iframe
          title={title}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-canvas text-left"
      aria-label={`Play ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
        alt={title}
        loading={priority ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <span className="stage-veil absolute inset-0" aria-hidden />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-brass/70 bg-canvas/70 text-brass backdrop-blur transition-colors group-hover:bg-brass group-hover:text-canvas">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
      <span className="absolute inset-x-0 bottom-0 p-4">
        <span className="wordmark block text-lg text-ink">{title}</span>
      </span>
    </button>
  );
}
