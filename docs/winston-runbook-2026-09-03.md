# Winston's runbook — mail + DNS for johnelijahmusic.com (and the Palm Republic note)

One sitting, top to bottom. Everything here is on your side of the wall (Bluehost DNS panel, Google Admin console). Say "done" and I verify each record from outside and flip the site's mail live.

## A. Google Workspace (admin.google.com, signed in as admin@johnelijahmusic.com)

1. **Aliases** — Users → admin@ → *User information* → *Alternate email addresses* → add `booking@` and `contact@`. (Single-mailbox model: one inbox, aliases for the public-facing names. `john@` as a real user is fine if he wants his own inbox.)
2. **Catch-all** — Apps → Google Workspace → Gmail → Routing → *Default routing* → add: envelope recipient = *all recipients* → action *Modify message* → *Change envelope recipient* → `admin@johnelijahmusic.com`. Any typo'd address lands, never bounces.
3. **DKIM** — Apps → Google Workspace → Gmail → *Authenticate email* → select the domain → *Generate new record* (2048-bit, selector `google`). Copy the TXT value. **Don't click "Start authentication" until step B3 is published** (it fails if the record isn't live yet). Come back and click it after.
4. **App password for the site** — still as admin@: myaccount.google.com/security → turn on 2-Step Verification if it isn't → myaccount.google.com/apppasswords → name it `johnelijahmusic-site` → copy the 16-character password → paste it to me. I set it on Vercel as `SMTP_PASS`; quotes and inquiry alerts start sending immediately from `booking@` (alias of admin@).

## B. Bluehost DNS — johnelijahmusic.com

| Type | Host | Value | Why |
|---|---|---|---|
| A | `www` | `76.76.21.21` | replace the CNAME — Bluehost fabricates an A for `cname.vercel-dns.com` (the PR pathology) |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | **SPF is missing today** — Gmail/Outlook will spam-folder or reject mail from the domain without it |
| TXT | `google._domainkey` | *(the DKIM value from A3)* | signs outbound mail |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@johnelijahmusic.com; adkim=r; aspf=r` | reporting mode first; tighten to `p=quarantine` after two clean weeks |

Leave in place: `@` A `76.76.21.21` (done), MX `1 smtp.google.com` (done), the `google-site-verification` TXT (done).

## C. Bluehost DNS — johnelijahband.com

| Type | Host | Value |
|---|---|---|
| A | `www` | `76.76.21.21` (replace the CNAME) |
| TXT | `@` | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject` |

No mail lives on this domain, so the last two say "nobody may send as johnelijahband.com" — closes the spoofing hole on a parked-for-redirect domain.

## D. After you say done

- I verify SPF/DKIM/DMARC from outside (authoritative + Google/Cloudflare), you click *Start authentication* in A3, and I send the first live quote test from HQ.
- MX-probe check (non-sending) confirms Google accepts `booking@` and `contact@`.

---

## What happened with Palm Republic (PR) and what to do

**What happened.** On `hq.thepalmrepublic.com` you set a CNAME to `cname.vercel-dns.com`. Bluehost's nameservers, when answering for that CNAME, *append a fabricated A record for Vercel's hostname* (`74.220.199.6`, a Newfold parking box), and sloppy ISP resolvers cache it. Result: the subdomain loaded from Google's resolver and died on home routers, and Vercel's checker flip-flopped. You swapped `hq` to an A record → clean everywhere. Bluehost still does it for any CNAME to an outside target. **The same thing is happening right now on `www.thepalmrepublic.com` and on both `www.johnelijah*` hosts** — they work today because most resolvers ignore the extra A, but it's the same time bomb.

**The second finding (new tonight):** `thepalmrepublic.com` has Google Workspace MX but **no SPF, no DKIM, no DMARC records** — only the Facebook and Google verification TXTs. Mail from the Palm Republic domain is unauthenticated, which is why "our email is broken" complaints happen (Gmail has required SPF+DKIM for bulk senders since 2024, and increasingly for everyone).

**What you do at Bluehost for thepalmrepublic.com**

| Type | Host | Value |
|---|---|---|
| A | `www` | `76.76.21.21` (replace the CNAME) |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `google._domainkey` | *(generate in the Palm Republic Google Admin → Gmail → Authenticate email, same as A3)* |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@thepalmrepublic.com` (or whichever PR mailbox you read) |

If the PR Google Workspace has a Shopify-era app sending mail (order notifications), that sender needs to be in the SPF too — tell me what sends and I'll write the exact string.

**Longer term (post-launch, your call):** transfer both John Elijah domains and thepalmrepublic.com into Vercel as the registrar so DNS lives with the sites and the Bluehost CNAME problem disappears. Needs the Bluehost unlock + EPP codes.

## Catch-all (Google Workspace) — do this once, 2 minutes

Goal: anything@johnelijahmusic.com that is not a real user or alias lands in admin@ instead of bouncing. Right now a random address gets a 550 from Google, so this is not yet active.

1. admin.google.com → **Apps** → **Google Workspace** → **Gmail** → **Routing** (the page titled Routing, not Default routing and not the "Routing" card at the top of Gmail settings).
2. Under **Routing** click **CONFIGURE** (or **ADD ANOTHER RULE** if one exists).
3. Description: `Catch-all to admin`.
4. Email messages to affect: check **Inbound** only.
5. "For the above types of messages, do the following": leave **Modify message** selected.
6. Under **Envelope recipient** tick **Change envelope recipient** → **Replace recipient** → `admin@johnelijahmusic.com`.
7. Scroll to **Options** near the bottom: under "Account types to affect" **uncheck Users** and **check Unrecognized / Catch-all**. This is the step that was missing; without it the rule only rewrites mail for real users.
8. Save. Wait 5 to 10 minutes.

Check: I will probe with a non-sending SMTP RCPT test to a random localpart; Google answers 250 instead of 550 when it is live.

## Nameservers → Vercel — yes, this is the right move; do it now

Why: Bluehost's DNS nodes served two different answers for a day and the Vercel checker needed a manual detach to see the apex. Vercel-hosted DNS removes Bluehost from the daily path entirely; Bluehost stays only as registrar.

Both domains, same steps:

1. my.bluehost.com → **Domains** → click the domain → **Nameservers** (sometimes under DNS / Manage).
2. Choose **Custom nameservers** (not "Use Bluehost nameservers").
3. Enter exactly two:
   `ns1.vercel-dns.com`
   `ns2.vercel-dns.com`
4. Save. Repeat for the second domain.

What happens next, no action from you:
- The watcher I left running polls every minute. The moment the registry shows Vercel, it creates on Vercel DNS: the MX records for Google, SPF, the DKIM key you pasted, DMARC, and Google's site-verification TXT. Mail keeps flowing; there is no gap because the old and new answers are both correct during propagation.
- Apex + www for both domains are already known to Vercel, so the site does not move.
- Propagation: registry updates in minutes; most resolvers within an hour; worst case 24 to 48 hours for stragglers.

Do NOT delete any records at Bluehost. Leave the Bluehost zone as is; once nameservers move, it is simply no longer asked.

## Band finance — what we need from John (Settings → Players in HQ)

For each player who ever plays a John Elijah date:
- Name, instrument, and whether they are a regular or a sub.
- Standard per-show pay for a normal night (for example Gary ~$100, Joe ~$200 as John mentioned), and whether that changes for a duo/trio vs the full band.
- How they get paid: Venmo, Zelle, cash, check, and the handle.
- Does John pay them the night of, or after the venue pays?

Band-level rules:
- Who eats travel: is fuel and lodging off the top before splits, or does John cover it?
- Per-diem or meals policy on runs.
- Sound and lights: hired per show, owned, or the venue's; if hired, who and roughly what.
- Merch at shows: who sells, how cash is tracked, does merch money mix with the door.
- Tips: pooled and split, or John's.
- Deposits: they come to us through Stripe; where does the balance get paid and by whom (venue pays John, John pays band).
- Year-end: does anyone need a 1099 from John, or is it all under the table and cash. This changes whether we track "paid" per player seriously.

Review flags I'd raise with John:
- A leader share. Most bands pay sidemen a flat rate and the leader keeps the remainder; the P&L in HQ assumes that (net = quote minus players minus expenses).
- Sub rates. Subs usually cost more than regulars. Keep a per-show override, which HQ already has.
- Mileage. If the van is John's, a per-mile number (the IRS rate is a fine default) is cleaner than reimbursing fuel receipts.
