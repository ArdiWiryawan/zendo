// Vercel serverless function: create a Mayar payment-link for a premium pack.
// Keeps the Mayar API key server-side. The browser only receives the hosted
// checkout URL and redirects to it.
//
// Env: MAYAR_API_KEY (from https://web.mayar.id → Integration → API Key)
//      MAYAR_API_URL (optional; defaults to production https://api.mayar.id)
//      MAYAR_REDIRECT_URL (optional; where the buyer lands after payment)
//
// DEMO / SANDBOX MODE: when MAYAR_API_KEY is unset, this returns a fake checkout
// URL that redirects straight back to `/packs?purchased=<packId>` — the client
// treats it as a successful payment and unlocks the pack. Lets you try the whole
// flow (button → redirect → unlock) with zero configuration.

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
  const returnUrl = process.env.MAYAR_REDIRECT_URL ?? `${origin}/packs?purchased=${packId}`;

  // ── DEMO MODE (no API key) ────────────────────────────────────────────────
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) {
    return res.json({
      link: returnUrl, // "checkout" that instantly succeeds
      id: `demo_${packId}`,
      demo: true,
    });
  }

  const apiUrl = process.env.MAYAR_API_URL ?? "https://api.mayar.id";

  try {
    const resp = await fetch(`${apiUrl}/hl/v2/products/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: packId, // stable key for webhook reconciliation
        amount,
        redirectUrl: returnUrl,
      }),
    });
    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return res.status(resp.status).json({ error: json?.messages ?? "Mayar error", detail: json });
    }
    return res.json({ link: json?.data?.link, id: json?.data?.id, demo: false });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Network error" });
  }
}
