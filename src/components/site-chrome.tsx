import Link from "next/link";
import { SITE } from "@/lib/site";

const NAV = [
  { href: "/shows", label: "Shows" },
  { href: "/music", label: "Music" },
  { href: "/photos", label: "Photos" },
  { href: "/band", label: "The Band" },
  { href: "/shop", label: "Merch" },
];

export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" | "xl" }) {
  const cls =
    size === "xl"
      ? "text-[clamp(3.2rem,11vw,9rem)]"
      : size === "lg"
        ? "text-5xl md:text-7xl"
        : "text-xl";
  return (
    <span className={`wordmark ${cls} block`} aria-label={SITE.name}>
      John Elijah
    </span>
  );
}

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-canvas-edge/60 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-baseline gap-2" aria-label={`${SITE.name} home`}>
          <Wordmark />
          <span className="wordmark-sub hidden text-[0.6rem] text-ink-faint sm:inline">band</span>
        </Link>
        <nav className="flex items-center gap-5 overflow-x-auto text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="brass-link whitespace-nowrap text-ink-dim hover:text-ink">
              {item.label}
            </Link>
          ))}
          <Link
            href="/book"
            className="whitespace-nowrap rounded-full border border-brass/70 px-4 py-1.5 font-medium text-ink transition-colors hover:bg-brass hover:text-canvas"
          >
            Book the band
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-canvas-edge/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          <Wordmark size="lg" />
          <p className="label mt-3">{SITE.origin} · {SITE.bookingRadius}</p>
          <LoneStarBadge className="mt-4" />
        </div>
        <div className="flex flex-col items-start gap-2 text-sm text-ink-dim md:items-end">
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="brass-link hover:text-ink">
            Instagram — {SITE.instagramHandle}
          </a>
          <a href={SITE.spotifyArtistUrl} target="_blank" rel="noopener noreferrer" className="brass-link hover:text-ink">
            Spotify — John Elijah
          </a>
          <Link href="/book" className="brass-link hover:text-ink">
            Booking
          </Link>
          <Link href="/epk" className="brass-link hover:text-ink">
            Press kit (EPK)
          </Link>
          <a href={SITE.photographer.url} target="_blank" rel="noopener noreferrer" className="brass-link hover:text-ink">
            Photography — {SITE.photographer.name} · {SITE.photographer.company}
          </a>
          <p className="text-ink-faint">© {new Date().getFullYear()} {SITE.bandName}</p>
        </div>
      </div>
    </footer>
  );
}

export function LoneStarBadge({ className = "", size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  return (
    <a
      href={SITE.affiliationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`lonestar-badge ${size === "lg" ? "lonestar-badge-lg" : ""} ${className}`}
      aria-label={SITE.affiliation}
    >
      {/* Lone Star's own public mark (lonestarbeer.com) — Winston: promote openly */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/lone-star-white.svg" alt="" className="lonestar-mark" aria-hidden />
      <span>{SITE.affiliation}</span>
    </a>
  );
}

export function SectionHeading({
  label,
  title,
  action,
}: {
  label: string;
  title: React.ReactNode;
  action?: { href: string; text: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="label mb-2">{label}</p>
        <h2 className="wordmark text-3xl md:text-5xl">{title}</h2>
      </div>
      {action ? (
        <Link href={action.href} className="brass-link mb-1 whitespace-nowrap text-sm text-ink-dim hover:text-ink">
          {action.text} →
        </Link>
      ) : null}
    </div>
  );
}
