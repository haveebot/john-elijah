import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Stable lastModified (cost-shape gate: a build-time `new Date()` would tell
// crawlers every deploy changed every page). Bump when content genuinely shifts.
const LAST = new Date("2026-09-03");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.domain}/`, lastModified: LAST, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.domain}/shows`, lastModified: LAST, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.domain}/book`, lastModified: LAST, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.domain}/music`, lastModified: LAST, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.domain}/band`, lastModified: LAST, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.domain}/photos`, lastModified: LAST, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.domain}/shop`, lastModified: LAST, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.domain}/epk`, lastModified: LAST, changeFrequency: "monthly", priority: 0.7 },
  ];
}
