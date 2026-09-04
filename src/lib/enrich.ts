/**
 * Contact enrichment — LITERAL scrape only. Fetches a venue's homepage and
 * the usual contact/booking pages, pulls mailto: links and visible email
 * addresses, and returns them with the page they came from. No pattern
 * guessing, no paid finders (house rule from the Farley first-touch build).
 */

const PATHS = ["", "/contact", "/contact-us", "/booking", "/book", "/bookings", "/about", "/events", "/live-music", "/music"];
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JUNK = /(sentry|wixpress|example\.com|domain\.com|yourdomain|email\.com|\.png$|\.jpg$|\.gif$|\.svg$|\.webp$|noreply|no-reply|godaddy|squarespace|wordpress|shopify|cloudflare|w3\.org|schema\.org)/i;

export type FoundEmail = { email: string; page: string; kind: "mailto" | "text" };

export async function scanSiteForEmails(website: string, maxPages = PATHS.length): Promise<{ found: FoundEmail[]; pagesTried: number; error?: string }> {
  let base: URL;
  try {
    base = new URL(website.startsWith("http") ? website : `https://${website}`);
  } catch {
    return { found: [], pagesTried: 0, error: "bad-url" };
  }
  const found = new Map<string, FoundEmail>();
  let tried = 0;
  for (const p of PATHS.slice(0, maxPages)) {
    const url = new URL(p || "/", base).toString();
    tried += 1;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", Accept: "text/html" },
      });
      clearTimeout(t);
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) continue;
      const html = (await res.text()).slice(0, 600_000);
      for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) {
        const e = decodeURIComponent(m[1]).trim().toLowerCase();
        if (EMAIL_RE.test(e) && !JUNK.test(e) && !found.has(e)) found.set(e, { email: e, page: url, kind: "mailto" });
      }
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
      for (const m of text.matchAll(EMAIL_RE)) {
        const e = m[0].toLowerCase();
        if (!JUNK.test(e) && !found.has(e)) found.set(e, { email: e, page: url, kind: "text" });
      }
      if (found.size >= 6) break;
    } catch {
      /* unreachable page — move on */
    }
  }
  return { found: Array.from(found.values()), pagesTried: tried };
}

export function roleForEmail(email: string): string {
  const l = email.split("@")[0];
  if (/book|booking|talent|entertainment|music|band/.test(l)) return "booker";
  if (/event|private|party/.test(l)) return "events";
  if (/owner|gm|manager|mgr/.test(l)) return "manager";
  return "general";
}
