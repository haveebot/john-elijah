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
