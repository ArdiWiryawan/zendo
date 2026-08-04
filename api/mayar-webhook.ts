// Vercel serverless function: Mayar payment webhook.
// Mayar POSTs here when a payment completes. We record the paid pack so the
// client can sync-unlock premium packs across devices.
//
// Register in Mayar dashboard: webhook URL = https://<your-domain>/api/mayar-webhook
//
// Env:
//   MAYAR_WEBHOOK_SECRET — optional shared secret checked via the `x-mayar-token`
//     header when set on the Mayar side.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — to persist purchases.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional shared-secret check (set the same value in the Mayar dashboard).
  const secret = process.env.MAYAR_WEBHOOK_SECRET;
  if (secret) {
    const token = (req.headers["x-mayar-token"] ?? req.headers["x-mayar-signature"] ?? "").toString();
    if (token !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const body = req.body ?? {};
  // Mayar webhook payload shape: { data: { id, name, amount, status, ... } }.
  const data = body.data ?? body;
  const packId = (data.name ?? "").toString();
  const amount = Number(data.amount ?? 0);
  const status = (data.status ?? data.paymentStatus ?? "").toString().toLowerCase();

  if (!packId || !amount) {
    return res.status(400).json({ error: "Missing packId/amount" });
  }
  // Only record completed payments.
  if (status && status !== "success" && status !== "paid" && status !== "completed" && status !== "settlement") {
    return res.status(200).json({ ok: true, ignored: status });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const id = data.id ? data.id.toString() : `${packId}-${Date.now()}`;
      const resp = await fetch(`${supabaseUrl}/rest/v1/zendo_purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          id,
          pack_id: packId,
          amount,
        }),
      });
      // Upsert so a duplicate webhook doesn't fail.
      if (resp.status === 409) {
        await fetch(`${supabaseUrl}/rest/v1/zendo_purchases?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ pack_id: packId, amount }),
        });
      }
    } else {
      // No persistence configured — return ok so Mayar stops retrying, but log.
      console.warn("Mayar webhook: SUPABASE_URL/KEY not set; purchase not persisted");
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Mayar webhook error", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
}
