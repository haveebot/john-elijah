# For John — connecting Instagram and Facebook to HQ (banked; send once mail is live)

Subject: Two quick things so we can post for you from HQ

John —

We're setting up HQ so shows, photos, and Lone Star announcements can post to Instagram and Facebook without you doing it by hand. Meta only lets a tool manage a *Page* and a *professional* Instagram account, never a personal profile, so there are four one-time steps. About fifteen minutes.

1. **Make @johnelijahmusic a Professional account.** Instagram app → Settings → Account type and tools → Switch to professional account → Creator (Musician/Band). Free; nothing else changes.

2. **A Facebook Page for John Elijah Band.** If one exists, skip. If not: facebook.com/pages/create → "John Elijah Band" → category Musician/Band. Your personal profile stays personal.

3. **Link Instagram to the Page.** On the Page: Settings → Linked accounts → Instagram → Connect → sign in as @johnelijahmusic.

4. **Give us access.** business.facebook.com → Settings → Users → Partners → Add → *Give a partner access to your assets* → enter Business ID **[PALM REPUBLIC PORTFOLIO ID — fill in]** → check the Page and the Instagram account → full control → Confirm.

After step 4 I'll get a notification, mint the connection, and you'll see a **Social** tab in HQ: draft a post, pick the photo, schedule or send to both at once. Reply with your best email and phone for the HQ login while you're at it.

— Winston

---
*Operator notes (not for John):* after his step 4, mint the token under **The Palm Republic** business portfolio (the umbrella that already holds the PAL app) with `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `business_management`. Verify with `/debug_token` (granular_scopes must list both assets) per the OAuth-scope-layers rule. Organic insights won't return via API — measure clicks on our side. Fill the portfolio Business ID from business.facebook.com → Settings → Business info before sending.
