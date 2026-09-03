# johnelijahmusic.com — John Elijah Band

Full-stack build for **John Elijah** (Port Aransas, TX): public site + **HQ** operator hub
with the booking pipeline, one Next.js app, one Neon Postgres. HeyeDeploy tenant;
Dank & Co / FC Hub lineage.

## Surfaces

- **Public site** (`/`): hero, shows (dated + standing residencies), music (Take and Give,
  Spotify embed), photos, the band + press, **book-the-band intake**, merch (Stripe, no-keys
  mode = notify-me). Static/ISR everywhere — no per-request DB on public routes.
- **HQ** (`/hq`): bookings pipeline (inquiry → quoted → hold → confirmed → deposit paid →
  played), quote + deposit, email the quote, promote a booking to the public calendar;
  shows + residencies; music/band/press; photo library (tags drive the site); merch catalog;
  orders with **Shippo labels**; rate card; MCP agent tokens.
- **MCP** at `/api/mcp` (bearer tokens minted in HQ → Settings).

## Stack

Next.js + TypeScript + Tailwind 4 · Neon Postgres (`pg`) · Vercel Blob · Stripe (Checkout +
webhook; no-keys mode) · Shippo (labels; no-keys mode) · Resend (mail; no-keys mode) ·
Anthropic API (optional drafting) · MCP.

## Local dev

```
npm install
cp .env.example .env.local   # fill in
npm run migrate              # applies src/lib/db/schema.sql (idempotent)
npm run seed                 # loads scripts/seed-data/content.ts (idempotent upserts)
npm run import-photos -- <dir> --tags stage --credit "Photographer" --taken 2025-05-25 --featured 4
npm run dev
```

## Domains

- `johnelijahmusic.com` — canonical. `www` and `johnelijahband.com` 301 here (next.config).
- Bluehost DNS: **A record → 76.76.21.21** (never CNAME through Bluehost to Vercel).

## Docs

`docs/build-spec.md` — the model, decisions, launch checklist, operator tasks.
