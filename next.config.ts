import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Spotify cover art until a Blob asset is mapped to the release
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
    ],
    // Photos are pre-sized at import (≤2400 web / ≤800 thumb) so the
    // optimizer never chews a 6000px original. Cost-shape gate.
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // johnelijahband.com → the canonical music domain (Winston, 2026-09-03)
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?johnelijahband\\.com" }],
        destination: "https://johnelijahmusic.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.johnelijahmusic\\.com" }],
        destination: "https://johnelijahmusic.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
