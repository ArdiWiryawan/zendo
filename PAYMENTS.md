# Zendo Payments — Mayar Integration

Premium journal packs unlock via [Mayar](https://mayar.id) hosted checkout. The
flow is fully serverless (Vercel functions) so the Mayar API key never reaches
the browser.

## Flow

```
User taps "Pay with Mayar" on a premium pack
  → POST /api/mayar-checkout { packId }
      (server: creates Mayar payment-link with server-side price)
  → redirect to Mayar hosted checkout (QRIS / VA / e-wallet)
  → payment success
  → Mayar redirects back to /packs?purchased=<packId>
      (client marks pack unlocked locally + syncs from Supabase)
  → Mayar webhook POST /api/mayar-webhook
      (server: persists purchase to Supabase for cross-device unlock)
```

## Files

| File | Role |
|------|------|
| `api/mayar-checkout.ts` | Creates the payment link; returns checkout URL. Server-side price map (mirror of `src/constants/defaultData.ts`). |
| `api/mayar-webhook.ts` | Receives Mayar's payment-complete webhook; persists to `zendo_purchases`. Idempotent, optional shared-secret check. |
| `src/lib/supabase.ts` | `getPurchases()` reads paid pack ids (anon-read RLS). |
| `src/store/useMonkStore.ts` | `syncPurchases()` merges Supabase-paid packs into `purchasedPackIds`. |
| `src/screens/JournalPacks.tsx` | `PurchaseModal` calls `/api/mayar-checkout`, handles the `?purchased=` return. |

## Setup

1. **Deploy to Vercel.** `vercel.json` exempts `/api/*` from the SPA rewrite.

2. **Set env vars** (Vercel project → Settings → Environment Variables):

   | Var | Required | Where |
   |-----|----------|-------|
   | `MAYAR_API_KEY` | ✅ | web.mayar.id → Integration → API Key |
   | `MAYAR_REDIRECT_URL` | optional | overrides the default `?purchased=` return URL |
   | `MAYAR_WEBHOOK_SECRET` | optional | shared secret for webhook auth |
   | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | optional | needed to persist purchases for cross-device unlock |
   | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | optional | client reads purchases (anon) |

3. **Create the Supabase table** — run `supabase_init.sql` (adds `zendo_purchases`
   with anon-read RLS).

4. **Register the webhook** in the Mayar dashboard:
   URL = `https://<your-domain>.vercel.app/api/mayar-webhook`
   If you set `MAYAR_WEBHOOK_SECRET`, put the same value in the Mayar dashboard.

5. **Verify:** open a premium pack → Pay with Mayar → complete a sandbox/test
   payment → confirm it unlocks and persists.

## Local dev

- The API functions run on Vercel; `vite dev` does not serve `/api/*`. Test the
  client flow against a deployed preview, or run `vercel dev`.
- `purchasePack` still works as a manual unlock (used by the webhook-return
  path and `syncPurchases`).

## Demo / sandbox mode (default)

With **no `MAYAR_API_KEY` set**, the checkout endpoint returns a fake link that
redirects straight back to `/packs?purchased=<packId>`. The client treats it as a
successful payment and unlocks the pack — you can try the full UI flow
(button → redirect → unlock → "Pack terbuka") with zero configuration. The modal
shows a "Demo mode" badge so it's obvious no real payment happened.

To go live, set `MAYAR_API_KEY` (and `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` +
the anon pair for cross-device sync). No client code change needed.

## CLI

`mayar` CLI (installed via `curl -fsSL https://dev.mayar.id | sh`) is a terminal
helper for Mayar API: `mayar init` / `mayar login` to authenticate, `mayar invoice`,
`mayar payment`, `mayar qrcode`, `mayar webhook`. It is not required for the web
flow above.
