// Vercel serverless function: Bayar GG payment webhook.
// Bayar GG POSTs here when a payment completes. We record the paid pack so the
// client can sync-unlock premium packs across devices.
//
// Register in Bayar GG dashboard (Developer → Webhook & Callback):
//   callback_url = https://<your-domain>/api/bayargg-webhook
//
// Env:
//   BAYARGG_WEBHOOK_SECRET — REQUIRED. Shared secret from the Bayar GG dashboard
//     (Developer → Webhook & Callback), NOT the API key. Used to verify the
//     HMAC SHA256 signature in X-Webhook-Signature. The handler FAILS CLOSED
//     when it is unset, so a missing secret can never silently accept forged
//     payments.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — to persist purchases.
//
// Security notes:
//   * The signature is an HMAC SHA256 over
//     `${payload.invoice_id}|${payload.status}|${payload.final_amount}|${timestampHeader}`
//     and is compared in constant time (crypto.timingSafeEqual), so the
//     comparison cannot be used to guess the signature byte-by-byte.
//   * amount is reconciled against the server-side PACK_PRICES table — a
//     forged/mismatched amount is rejected, not recorded.
//   * The purchase row id is derived from the Bayar GG invoice_id, making
//     webhook retries idempotent (same payment can never double-credit).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

// Mirror of the premium pack prices in src/constants/defaultData.ts. Kept
// server-side so the client cannot spoof a price (also enforced in
// api/bayargg-checkout.ts).
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

  // ── REQUIRED webhook-secret check (set the same value in the Bayar GG dashboard) ──
  const secret = process.env.BAYARGG_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Bayar GG webhook: BAYARGG_WEBHOOK_SECRET is not set; rejecting all webhooks");
    return res.status(503).json({ error: "Server misconfigured" });
  }

  const signature = (req.headers["x-webhook-signature"] ?? "").toString();
  const timestampHeader = (req.headers["x-webhook-timestamp"] ?? "").toString();
  if (!signature || !timestampHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body ?? {};
  // Bayar GG webhook payload shape (payment.paid):
  // { event, invoice_id, status, payment_method, amount, final_amount,
  //   unique_code, paid_at, paid_amount, paid_reff_num, customer_name,
  //   customer_email, customer_phone, description, redirect_url, timestamp, signature }
  const signatureData = `${body.invoice_id}|${body.status}|${body.final_amount}|${timestampHeader}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(signatureData).digest("hex");
  if (!safeEqual(signature, expectedSignature)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const packId = (body.description ?? "")
    .toString()
    .replace(/^zendo:/, "");
  const amount = Number(body.final_amount ?? 0);

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
    console.warn(`Bayar GG webhook: amount mismatch for ${packId}: got ${amount}, expected ${expected}; rejected`);
    return res.status(400).json({ error: "Amount mismatch" });
  }

  // Only record completed payments.
  const status = (body.status ?? "").toString().toLowerCase();
  if (status && status !== "paid" && status !== "success" && status !== "completed" && status !== "settlement") {
    return res.status(200).json({ ok: true, ignored: status });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      // Deterministic id from the Bayar GG invoice_id: retries for the same
      // payment map to the same row (upsert), so a re-delivered webhook can
      // never double-credit.
      const id = (body.invoice_id ?? "").toString();
      if (!id) {
        return res.status(400).json({ error: "Missing invoice_id" });
      }
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
      // No persistence configured — return ok so Bayar GG stops retrying, but log.
      console.warn("Bayar GG webhook: SUPABASE_URL/KEY not set; purchase not persisted");
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Bayar GG webhook error", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
}
