# Writing Coach for IELTS: paid version

IELTS Academic and General Training writing practice, marked by Claude against the official band descriptors.

- **Free:** each new account gets **2 free tests** (any mode).
- **Paid:** 1 credit = 1 marked task.

| Package | Credits | QRIS (Xendit, Midtrans or DANA) | PayPal |
|---|---|---|---|
| 1 task | 1 | Rp 4,900 | – |
| 1 full test (Task 1 + 2) | 2 | Rp 8,900 | – |
| 5 full tests | 10 | Rp 34,900 | US$4.99 |
| 10 full tests | 20 | Rp 59,900 | US$7.99 |

Prices are set in `public/core.js` (`PACKAGES`, `FREE_TESTS`). The server always uses these values, so a user can't change a price from the browser.

## How it fits together

```
Browser (public/)        Vercel functions (api/)                     Services
index.html, app.js  ──►  /api/start   uses a free test or credits ─► Supabase (accounts, credits, tests, orders)
core.js (shared)         /api/grade   marks one task ───────────────► Claude API (claude-sonnet-5-5)
                         /api/pay/midtrans-create → QRIS code ──────► Midtrans
                         /api/pay/midtrans-notify ◄── payment notice ─ Midtrans
                         /api/pay/dana-create → QRIS code ──────────► DANA (when QRIS_PROVIDER=dana)
                         /api/pay/dana-notify ◄──── payment notice ─ DANA
                         /api/pay/xendit-create → QRIS code ────────► Xendit (when QRIS_PROVIDER=xendit)
                         /api/pay/xendit-notify ◄── payment.succeeded ─ Xendit
                         /api/pay/paypal-create / -capture ─────────► PayPal
```

- The browser can only **read** its own data. Credits, tests and orders change only on the server.
- Credits are added **once per order**, and only after the server confirms the payment with Xendit, Midtrans, DANA or PayPal (a notification alone is never trusted).
- Each task allows up to 3 marking attempts, so a failed marking can be retried without paying again. Each marked task includes one model answer.

---

## Set it up (about 1–2 hours, mostly waiting for sign-ups)

Do the steps in this order. Keep a private note with every key you copy. **Never put keys in the code or in GitHub.**

### 1. Anthropic API key (for the marking)
1. Go to **console.anthropic.com** and create an account.
2. Under **Billing**, add credit.
3. **Set a monthly spend limit** (for example US$20 to start). This stops a bug or abuse from running up a large bill.
4. Under **API keys**, click **Create key** and copy it. This is `ANTHROPIC_API_KEY`.

### 2. Supabase (database and Google sign-in)
1. Go to **supabase.com** and create a new project. Choose the Singapore region, which is closest to Indonesia.
2. Open **SQL Editor → New query**. Paste all of `supabase/schema.sql` and click **Run**.
3. Open **Project Settings → API** and copy three values:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`. **This one is secret:** only put it in Vercel.

### 3. Google sign-in
1. Go to **console.cloud.google.com**, create a project, and open **APIs & Services → OAuth consent screen**. Choose **External** and fill in the app name and your email.
2. Open **Credentials → Create credentials → OAuth client ID** and choose **Web application**.
3. Under **Authorised redirect URIs**, add the callback URL shown in Supabase under **Authentication → Providers → Google**. It looks like `https://<your-project>.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and **Client secret** into Supabase (**Authentication → Providers → Google**), then turn the provider on.
5. After step 6 (Vercel), add your website address in Supabase under **Authentication → URL Configuration → Site URL**, for example `https://your-app.vercel.app`.

### 4. Midtrans (QRIS)
1. Register at **midtrans.com**. You can use the **Sandbox** (test mode) straight away, before your account is verified.
2. Open **Settings → Access Keys** and copy the **Server Key** → `MIDTRANS_SERVER_KEY`. Use the sandbox key for now.
3. After step 6, open **Settings → Payment → Notification URL** (sandbox first, and later production too) and set it to:
   `https://<your-app>.vercel.app/api/pay/midtrans-notify`
4. To go live, complete verification (KTP, NPWP, bank account) and make sure **QRIS** is activated on your account. Then switch to the **production** Server Key and set `MIDTRANS_IS_PRODUCTION=true`.

### 4a. Xendit (QRIS, recommended)
Uses Xendit's Payment Requests API (one-time QRIS codes). The QR code is shown on the site.
1. Register at **dashboard.xendit.co**. Test Mode works right away; Live Mode after business verification.
2. **Settings → API Keys → Generate secret key** with **Money-in: Write** permission → `XENDIT_SECRET_KEY` (test keys start with `xnd_development_`).
3. **Settings → Webhooks**: copy the **verification token** → `XENDIT_CALLBACK_TOKEN`, and set the payment webhook URL (Payments / "payment.succeeded") to `https://www.writingcoach.id/api/pay/xendit-notify`.
4. Optional, for several apps under one company: create a **xenPlatform** sub-account for Writing Coach and put its id in `XENDIT_SUB_ACCOUNT_ID`.
5. Run `supabase/schema.sql` again (safe to re-run) so orders can use provider `xendit`.
6. Set `QRIS_PROVIDER=xendit`, redeploy. In test mode the payment box has a **Simulate payment** button. To go live: the live secret key and live webhook token.

### 4b. DANA (QRIS, optional alternative)
Uses DANA Enterprise's Payment Gateway through DANA's official SDK (`dana-node`). The QR code is shown on the site, like Midtrans.
1. Register at **dashboard.dana.id** (DANA Enterprise) and open **Developers** for the sandbox.
2. Make a key pair on your own computer (keep `private.pem` secret; never send it to anyone):
   ```bash
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```
   Upload **public.pem** in the DANA dashboard. Put the whole content of **private.pem** in Vercel as `DANA_PRIVATE_KEY`.
3. From the dashboard, copy **Client ID / X-PARTNER-ID** → `DANA_PARTNER_ID`, **Merchant ID** → `DANA_MERCHANT_ID`, and the **Shop ID** (externalStoreId, required for QRIS) → `DANA_SHOP_ID`.
4. Set the payment notification URL to `https://www.writingcoach.id/api/pay/dana-notify` (the site also sends it with each order).
5. Run `supabase/schema.sql` again (safe to re-run) so orders can use provider `dana`.
6. Set `QRIS_PROVIDER=dana` and `DANA_ENV=sandbox`, redeploy and test. To go live: production keys and IDs, `DANA_ENV=production`.

### 5. PayPal (bundles, in US dollars)
1. Go to **developer.paypal.com → Apps & Credentials** and click **Create App**. Start on the **Sandbox** tab.
2. Copy the **Client ID** → `PAYPAL_CLIENT_ID` and the **Secret** → `PAYPAL_CLIENT_SECRET`. Leave `PAYPAL_ENV=sandbox`.
3. To go live, create the app on the **Live** tab with a verified PayPal account, use those keys, and set `PAYPAL_ENV=live`.
4. To hide PayPal, leave `PAYPAL_CLIENT_ID` empty.

### 6. Deploy on Vercel
1. Go to **vercel.com**, sign in with GitHub, and click **Add New → Project**. Import `rendyrtama/rendyrtama`.
2. Set **Root Directory** to `ielts-writing-coach-pro`. The framework preset is **Other**, and nothing needs building.
3. Under **Environment Variables**, add every value from `.env.example` with your real keys.
4. Click **Deploy**. Your site will be at `https://<project-name>.vercel.app`. You can add your own domain later under **Settings → Domains**.
5. Go back and finish step 3.5 (Supabase Site URL) and step 4.3 (Midtrans Notification URL).

Note: marking can take up to about 90 seconds, so `vercel.json` gives the marking functions 120 seconds. If Vercel rejects that on your plan, lower it to the maximum Vercel shows.

### 7. Test everything in sandbox mode (no real money)
1. Open your site and sign in with Google. You should see **2 free · 0 credits**.
2. Do two free tests and check the marking works.
3. Start a third test. You'll be sent to **Credits**. Pay with QRIS: copy the QR image link from the payment box and pay it in the **Midtrans QRIS simulator** (linked from the Midtrans sandbox docs). Your credits should appear within a few seconds, and the test should start.
4. Buy a bundle with PayPal using a **sandbox buyer account** (developer.paypal.com → Sandbox → Accounts).
5. In Supabase **Table Editor**, check the `orders` and `profiles` rows.

### 8. Go live
- [ ] Midtrans verified, QRIS active, production Server Key set, `MIDTRANS_IS_PRODUCTION=true`, production Notification URL set
- [ ] PayPal live app keys set, `PAYPAL_ENV=live`
- [ ] Anthropic spend limit set
- [ ] One real payment of Rp 4,900 tested end to end
- [ ] Redeploy in Vercel after changing environment variables (**Deployments → ⋯ → Redeploy**)

---

## Running costs (estimates)

| Item | Cost |
|---|---|
| Marking one task (Claude Sonnet 5.5) | ≈ Rp 1,200 |
| One model answer | ≈ Rp 500–1,000 |
| Each new user's 2 free tests | up to ≈ Rp 5,000 (2 full tests) |
| QRIS fee (Midtrans) | about 0.7% of the payment (check Midtrans's current pricing) |
| PayPal fee | a percentage plus a fixed fee per payment (check PayPal's current pricing) |
| Vercel, Supabase | free tiers are enough to start |

Check your real costs after the first 20–30 paid tests (Anthropic console → Usage). If needed, adjust the prices in `PACKAGES`.

## Support and refunds
- If marking fails, the user can press **Try again** (up to 3 times per task) at no extra cost.
- To give credits by hand (for example a refund as credits), open Supabase **Table Editor → profiles** and edit `credits` for that user.
- To find a payment, look up the order number (`WC-…`, shown in the payment box) in the `orders` table.

## Legal notes
- The product name avoids using "IELTS" as a brand, and the page says it is not affiliated with IELTS. Keep that note.
- Scores are estimates from an AI examiner, not official results. The page says this too.
- Practice questions and data are original. The band descriptors are quoted from the public IELTS documents.
- Before going live, add a short privacy note and terms page: essays are stored in your Supabase database, and you sell digital credits. Check whether your business needs to be registered for tax (NIB/NPWP) once income grows.

## Files
- `public/index.html`, `public/app.js`: the page.
- `public/core.js`: the question bank, descriptors, structures, prices and marking prompt. The browser and the server share it.
- `api/*.js`: server endpoints. `api/_lib/` holds shared server code (Supabase, Claude, Xendit, Midtrans, DANA, PayPal).
- `supabase/schema.sql`: database tables, security rules and credit functions.
