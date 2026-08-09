# Zendo Payments — Bayar GG Integration

Premium journal packs unlock via [Bayar GG](https://www.bayar.gg) hosted
checkout. The flow is fully serverless (Vercel functions) so the Bayar GG API
key never reaches the browser.

## Flow

```
User taps "Pay with Bayar GG" on a premium pack
  → POST /api/bayargg-checkout { packId }
      (server: creates Bayar GG payment with server-side price)
  → redirect to Bayar GG hosted payment page (QRIS / VA / e-wallet)
  → payment success
  → Bayar GG redirects back to /packs?purchased=<packId>
      (client marks pack unlocked locally + syncs from Supabase)
  → Bayar GG webhook POST /api/bayargg-webhook
      (server: persists purchase to Supabase for cross-device unlock)
```

## Files

| File | Role |
|------|------|
| `api/bayargg-checkout.ts` | Creates the payment; returns the payment URL. Server-side price map (mirror of `src/constants/defaultData.ts`). |
| `api/bayargg-webhook.ts` | Receives Bayar GG's payment-complete webhook; verifies the HMAC SHA256 signature; persists to `zendo_purchases`. Idempotent, fail-closed secret check. |
| `src/lib/supabase.ts` | `getPurchases()` reads paid pack ids (anon-read RLS). |
| `src/store/useMonkStore.ts` | `syncPurchases()` merges Supabase-paid packs into `purchasedPackIds`. |
| `src/screens/JournalPacks.tsx` | `PurchaseModal` calls `/api/bayargg-checkout`, handles the `?purchased=` return. |

## Setup

1. **Deploy to Vercel.** `vercel.json` exempts `/api/*` from the SPA rewrite.

2. **Set env vars** (Vercel project → Settings → Environment Variables):

   | Var | Required | Where |
   |-----|----------|-------|
   | `BAYARGG_API_KEY` | ✅ | Bayar GG dashboard → API |
   | `BAYARGG_WEBHOOK_SECRET` | ✅ | Bayar GG dashboard → Developer → Webhook & Callback (NOT the API key) |
   | `BAYARGG_API_URL` | optional | overrides the default `https://www.bayar.gg/api` |
   | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | optional | needed to persist purchases for cross-device unlock |
   | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | optional | client reads purchases (anon) |

3. **Create the Supabase table** — run `supabase_init.sql` (adds `zendo_purchases`
   with anon-read RLS).

4. **Register the webhook** in the Bayar GG dashboard (Developer → Webhook &
   Callback):
   URL = `https://<your-domain>.vercel.app/api/bayargg-webhook`
   Set `BAYARGG_WEBHOOK_SECRET` in the Bayar GG dashboard — Bayar GG signs each
   callback with HMAC SHA256 over
   `${invoice_id}|${status}|${final_amount}|${X-Webhook-Timestamp}`.

5. **Verify:** open a premium pack → Pay with Bayar GG → complete a sandbox/test
   payment → confirm it unlocks and persists.

## Local dev

- The API functions run on Vercel; `vite dev` does not serve `/api/*`. Test the
  client flow against a deployed preview, or run `vercel dev`.
- `purchasePack` still works as a manual unlock (used by the webhook-return
  path and `syncPurchases`).

## Demo / sandbox mode (default)

With **no `BAYARGG_API_KEY` set**, the checkout endpoint returns a fake link
that redirects straight back to `/packs?purchased=<packId>`. The client treats
it as a successful payment and unlocks the pack — you can try the full UI flow
(button → redirect → unlock → "Pack terbuka") with zero configuration. The
modal shows a "Demo mode" badge so it's obvious no real payment happened.

To go live, set `BAYARGG_API_KEY` and `BAYARGG_WEBHOOK_SECRET` (and
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` + the anon pair for cross-device
sync). No client code change needed.
