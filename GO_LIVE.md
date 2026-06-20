# Pro go-live checklist (payments)

Status as of 2026-06-20 (verified against production):
- `POST /api/create-checkout-session` → **503** ("Payments not configured") — Stripe env NOT set in Vercel.
- `POST /api/stripe-webhook` → **503** — same.
- `POST /api/mascot-chat` → **401** — GEMINI + Supabase ARE configured; AI/Caps works for Pro users. ✅
- `BETA_WAITLIST = true` (src/App.jsx) — Pro CTAs capture a waitlist, checkout is intentionally off.

Do these IN ORDER. Do not flip the flag until step 4 passes.

## 1. Set Stripe env in Vercel (Production scope) — OWNER
- `STRIPE_SECRET_KEY`        = sk_live_… (a freshly rolled key — see step 2)
- `STRIPE_PRO_PRICE_ID`      = price_… (the live Pro price)
- `STRIPE_WEBHOOK_SECRET`    = whsec_… (from the webhook you register below)
- `APP_URL`                  = https://www.beattheexam.org
- confirm `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are present.
Register webhook in Stripe → endpoint `https://www.beattheexam.org/api/stripe-webhook`,
events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`.
Redeploy so the new env loads.

## 2. Roll the leaked key — OWNER (SECURITY, do before going live)
An `sk_test_…` key was pasted in chat previously → it is burned. Roll it in the
Stripe dashboard and never reuse it. Only the rolled key goes in Vercel.

## 3. Verify env loaded — re-probe (anyone)
```
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://www.beattheexam.org/api/create-checkout-session -H "Content-Type: application/json" -d '{}'
```
Expect **503 → 401** (env loaded; 401 = needs auth, which is correct). If still 503, env isn't set.

## 4. End-to-end test BEFORE flipping the flag — OWNER + me
With BETA_WAITLIST still true, grant yourself Pro another way (admin) and run a real
Stripe **test-mode** checkout end to end, OR do a £-real test then refund:
- checkout completes → `window.location.href = session.url` returns to app
- webhook fires → `user_profiles.subscription_status` becomes `pro`
- Pro features unlock; `Account → Manage billing` opens the Stripe portal
- cancel in portal → `.deleted`/`.updated` webhook downgrades to `free`

## 5. Flip the flag — me (one line) + deploy
- `src/App.jsx`: `const BETA_WAITLIST = true;` → `false`
- (optional polish) `src/components/TermsOfService.jsx` §6: drop "(not yet live)" from the Stripe line.
- Keep the waitlist branch intact — the flag may need to flip back.

## 6. Compliance done this session (✅) / still owner-side
- ✅ Terms now include §18 Billing/Cancellation/Refunds (auto-renewal, 14-day
  cooling-off + immediate-access waiver, under-18 cardholder, BEATTHEEXAM.ORG descriptor).
- ☐ Supabase → Auth → enable leaked-password (HIBP) protection. OWNER.
- ☐ Tax category in Stripe = **SaaS** `txcd_10103000` (NOT Educational). Statement
  descriptor = `BEATTHEEXAM.ORG`. (Decided; confirm set in dashboard.)
- ☐ Consider Sentry (error monitoring) before scaling — not a launch blocker.

## Rollback
If anything misbehaves post-launch: set `BETA_WAITLIST = true`, deploy. Checkout
is hidden again instantly; existing subscriptions are unaffected.
