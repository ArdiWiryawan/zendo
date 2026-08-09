// Vercel serverless function: Mayar payment webhook.
// Mayar POSTs here when a payment completes. We record the paid pack so the
// client can sync-unlock premium packs across devices.
//
// Register in Mayar dashboard: webhook URL = https://<your-domain>/api/mayar-webhook
//
// Env:
//   MAYAR_WEBHOOK_SECRET — REQUIRED. Shared secret Mayar sends in the
//     `x-mayar-token` header. The handler FAILS CLOSED when it is unset, so a
//     missing secret can never silently accept forged payments.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — to persist purchases.
//
// Security notes:
//   * The shared secret is compared in constant time (crypto.timingSafeEqual),
//     so the comparison cannot be used to guess the token byte-by-byte.
//   * amount is reconciled against the server-side PACK_PRICES table — a
//     forged/mismatched amount is rejected, not recorded.
//   * The purchase row id is derived from the Mayar payment id + pack, making
//     webhook retries idempotent (same payment can never double-credit).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

// Mirror of the premium pack prices in src/constants/defaultData.ts. Kept
// server-side so the client cannot spoof a price (also enforced in
// api/mayar-checkout.ts).
const PACK_PRICES: Record<string, number> = {
  pack_deep_discipline: 29000,
  pack_shadow_self: 29000,
  pack_creativity_play: 19000,
  pack_mindset_beliefs: 29000,
  pack_complete_100: 49000,
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── REQUIRED shared-secret check (set the same value in the Mayar dashboard) ──
  const secret = process.env.MAYAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Mayar webhook: MAYAR_WEBHOOK_SECRET is not set; rejecting all webhooks");
    return res.status(503).json({ error: "Server misconfigured" });
  }
  const token = (req.headers["x-mayar-token"] ?? req.headers["x-mayar-signature"] ?? "").toString();
  if (!token || !safeEqual(token, secret)) {
    return res.status(401).json({ error: "Unauthorized" });
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

  // Reconcile the amount against the known server-side price. A forged or
  // tampered payment record must never be stored.
  const expected = PACK_PRICES[packId];
  if (!expected) {
    return res.status(400).json({ error: `Unknown pack: ${packId}` });
  }
  if (amount !== expected) {
    console.warn(`Mayar webhook: amount mismatch for ${packId}: got ${amount}, expected ${expected}; rejected`);
    return res.status(400).json({ error: "Amount mismatch" });
  }

  // Only record completed payments.
  if (status && status !== "success" && status !== "paid" && status !== "completed" && status !== "settlement") {
    return res.status(200).json({ ok: true, ignored: status });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      // Deterministic id from the Mayar payment id: retries for the same
      // payment map to the same row (upsert), so a re-delivered webhook can
      // never double-credit.
      const id = data.id ? data.id.toString() : `${packId}-${amount}-${(data.paid_at ?? data.createdAt ?? "").toString()}`;
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
