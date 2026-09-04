import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { getCurrentOperator } from "@/lib/auth/session";

const HQ_NAV = [
  { href: "/hq", label: "Today" },
  { href: "/hq/bookings", label: "Bookings" },
  { href: "/hq/shows", label: "Shows" },
  { href: "/hq/music", label: "Music" },
  { href: "/hq/photos", label: "Photos" },
  { href: "/hq/files", label: "Files" },
  { href: "/hq/products", label: "Merch" },
  { href: "/hq/orders", label: "Orders" },
  { href: "/hq/settings", label: "Settings" },
];

export default async function HqLayout({ children }: { children: React.ReactNode }) {
  const who = await getCurrentOperator();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-canvas-edge/60 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/hq" className="flex items-baseline gap-2">
            <span className="wordmark text-lg">John Elijah</span>
            <span className="label">HQ</span>
          </Link>
          <nav className="flex items-center gap-4 overflow-x-auto text-sm">
            {HQ_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap text-ink-dim transition-colors hover:text-ink">
                {item.label}
              </Link>
            ))}
            {who ? (
              <span className="label whitespace-nowrap rounded-full border border-brass/50 px-3 py-1 text-brass">
                {who.name} · {who.role}
              </span>
            ) : null}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
