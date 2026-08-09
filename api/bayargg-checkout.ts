// Vercel serverless function: create a Bayar GG payment for a premium pack.
// Keeps the Bayar GG API key server-side. The browser only receives the hosted
// payment URL and redirects to it.
//
// Env: BAYARGG_API_KEY (from Bayar GG dashboard → API)
//      BAYARGG_API_URL (optional; defaults to production https://www.bayar.gg/api)
//
// DEMO / SANDBOX MODE: only entered when BAYARGG_DEMO_MODE=true. Returns a fake
// checkout URL that redirects straight back to `/packs?purchased=<packId>` —
// the client treats it as a successful payment and unlocks the pack. Demo mode
// is an explicit opt-in; a missing BAYARGG_API_KEY alone FAILS CLOSED (HTTP 500)
// so a misconfigured production deploy can never silently make packs free.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mirror of the premium pack prices in src/constants/defaultData.ts.
// Kept server-side so the client cannot spoof a price.
const PACK_PRICES: Record<string, number> = {
  pack_deep_discipline: 29000,
  pack_shadow_self: 29000,
  pack_creativity_play: 19000,
  pack_mindset_beliefs: 29000,
  pack_complete_100: 49000,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const packId = (req.body?.packId ?? "").toString();
  const amount = PACK_PRICES[packId];
  if (!amount) {
    return res.status(400).json({ error: "Unknown or free pack" });
  }

  const origin = req.headers.origin ?? "https://zendo.example";
  const redirectUrl = `${origin}/packs?purchased=${packId}`;

  // ── DEMO MODE (explicit opt-in only) ───────────────────────────────────────
  const apiKey = process.env.BAYARGG_API_KEY;
  if (!apiKey) {
    if (process.env.BAYARGG_DEMO_MODE === "true") {
      return res.json({
        url: redirectUrl, // "checkout" that instantly succeeds
        id: `demo_${packId}`,
        demo: true,
      });
    }
    // Fail closed: production misconfiguration must not silently give packs away.
    console.error("Bayar GG checkout: BAYARGG_API_KEY is not set (and BAYARGG_DEMO_MODE is not true); failing closed");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const apiUrl = process.env.BAYARGG_API_URL ?? "https://www.bayar.gg/api";

  try {
    const resp = await fetch(`${apiUrl}/create-payment.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        amount,
        description: `zendo:${packId}`, // stable key for webhook reconciliation
        payment_url: "https://www.bayar.gg/pay",
        redirect_url: redirectUrl,
        callback_url: `${origin}/api/bayargg-webhook`,
      }),
    });
    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return res.status(resp.status).json({ error: json?.message ?? "Bayar GG error", detail: json });
    }
    return res.json({ url: json?.data?.payment_url, id: json?.data?.invoice_id, demo: false });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Network error" });
  }
}
