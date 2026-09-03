# John Elijah — Build Spec (site + HQ + booking + mail + commerce)

v1 · 2026-09-03 · Winston Caraker × John Elijah Amundsen. Pattern: HeyeDeploy tenant; the
Dank & Co build is the code blueprint (same bones: auth, MCP, Stripe archetype, static host).

## 0. Shape

Two surfaces, one database:

1. **The site** — photo-led showpiece: the stage, the calendar, the record, the band, and
   the one thing the site is for: **book the band**. Static/ISR on every public route.
2. **HQ** (`/hq`) — the band's operating desk. The **booking pipeline** is the home surface;
   shows, music, photos, merch, orders, rate card, agent access around it.

## 1. Decisions locked (Winston, 2026-09-03)

- **Domains:** `johnelijahmusic.com` canonical; `johnelijahband.com` → 301. Both at Bluehost
  (Newfold/NetSol back end), exp 2027-03-29. `johnelijah.com` is NOT his — ignore.
- **Booking:** radius = all of Texas; no blackouts; working average ~$1,250/show. Rate card
  seeded solo $600 · duo $850 · trio $1,100 · four-piece $1,300 · full band $1,600 — HQ owns
  the numbers from here (Settings → Rate card).
- **Commerce:** Stripe checkout + **Shippo** labels from HQ (same as Palm Republic). Merch
  known to exist: tee, hat, CD (Kickstarter rewards) — seeded as drafts.
- **Mail:** create a mailbox on the domain (admin@ / booking@ / contact@ — address TBD).
  Resend sends from it; `BOOKING_NOTIFY_EMAIL` receives inquiry alerts.
- **Photos:** photographer's Drive share → `Winston/John Elijah` + the 5/25/25 set; anything usable. (7/6 + 7/27 sets are other bands.)
- **Access:** we hold Bluehost; John holds IG / Spotify for Artists / distributor / FB.
- **Logo:** Collie made the original — Winston asking her. Wordmark (Oswald caps) is the
  placeholder; album cover is a usable image, not the mark.

## 2. Data model (Neon)

```
configurations   key (solo|duo|trio|four_piece|full_band), label, lineup, base_cents, notes
bookings         contact, event_kind, event_date, start_time, hours, venue, city, configuration,
                 guests, budget_cents, quote_cents, deposit_cents, status, details, notes, source
booking_events   activity trail (note | status_change | email | quote)
shows            dated public calendar; booking_id links back; is_public; status
residencies      standing weekly gigs (none today — PSC closed; add from HQ)
releases/tracks  Take and Give (9 tracks, Spotify ids)
band_members     John + Graves, Soto, Redus, Felix
press            South Jetty · Chamber listing · Kickstarter
assets           photo library: web + thumb blob urls, tags (hero|band|stage|crowd), credit
products/variants/orders/order_items   Stripe archetype (+ weight_oz for parcels)
shipments        Shippo shipment/rate/transaction, label_url, tracking
subscribers      the list
users/agent_tokens/hub_preferences     FC Hub pattern
```

Pipeline: `inquiry → quoted → hold → confirmed → deposit_paid → played` (or passed / cancelled).
A booking with a date + venue promotes to a `shows` row (public for venue/festival, hidden
for private) from its HQ detail page.

## 3. Cost-shape gates (build gate, not assertion)

- Public routes: `revalidate = 3600` (shop 600); zero per-request DB. Middleware matcher
  covers `/hq/*` only.
- Photos are resized at import (≤2400 web / ≤800 thumb); the optimizer never sees a 6000px
  original. `next/image` with explicit `sizes` everywhere.
- No polling, no client waterfalls, no crons in v1.
- `robots: noindex` until DNS cutover; flip in `src/app/layout.tsx`.

## 4. Integrations — all no-keys-safe

| Integration | Env | Absent = |
|---|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | buy buttons render notify-me |
| Shippo | `SHIPPO_API_KEY`, `SHIP_FROM_JSON` | Orders shows "connect Shippo" |
| Resend | `RESEND_API_KEY`, `MAIL_FROM`, `BOOKING_NOTIFY_EMAIL` | sends no-op, booking still lands, event logged |
| Anthropic | `ANTHROPIC_API_KEY` | (unused in v1) |

## 5. Launch checklist

1. ~~Repo + Vercel project + Neon + Blob (API-provisioned)~~
2. ~~Schema, seed, photo import, operator account~~
3. Winston: Bluehost DNS — `johnelijahmusic.com` `@` A → 76.76.21.21, `www` CNAME →
   cname.vercel-dns.com (or A, if flaky); same for `johnelijahband.com`. MX/TXT for the
   mailbox once created. (Domains are already attached on the Vercel project.)
4. Winston: mailbox decision + creation → Resend domain verify → `RESEND_API_KEY`, `MAIL_FROM`,
   `BOOKING_NOTIFY_EMAIL` on Vercel.
5. Winston/John: Stripe account → keys; Shippo signup → key + ship-from address.
6. Collie: the original logo → replaces the wordmark; OG image regenerated.
7. Flip `robots` to index; FB/IG pre-scrape; announce.
