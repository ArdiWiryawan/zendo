import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Self-check: the Bayar GG webhook must FAIL CLOSED and verify every request.
// Rejects a regression that re-introduces silent/optional authentication.
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "bayargg-webhook.ts"), "utf8");

describe("bayargg-webhook security invariants", () => {
  it("requires BAYARGG_WEBHOOK_SECRET (fails closed, not optional)", () => {
    expect(src).toMatch(/process\.env\.BAYARGG_WEBHOOK_SECRET/);
    expect(src).not.toMatch(/if\s*\(\s*secret\s*\)\s*\{/); // old optional-secret guard
    expect(src).toMatch(/status\(503\)/); // misconfigured -> 503
  });

  it("verifies the HMAC SHA256 signature over the Bayar GG signature data", () => {
    expect(src).toMatch(/createHmac\("sha256", secret\)/);
    expect(src).toMatch(/\$\{body\.invoice_id\}\|\$\{body\.status\}\|\$\{body\.final_amount\}\|\$\{timestampHeader\}/);
  });

  it("compares the signature in constant time", () => {
    expect(src).toMatch(/timingSafeEqual/);
  });

  it("reconciles the amount against server-side PACK_PRICES", () => {
    expect(src).toMatch(/PACK_PRICES\[packId\]/);
    expect(src).toMatch(/Amount mismatch/);
  });

  it("never trusts the client to name a user (no user_id from body)", () => {
    expect(src).not.toMatch(/user_id/);
  });
});

describe("bayargg-checkout fail-closed invariant", () => {
  const checkout = readFileSync(join(__dirname, "bayargg-checkout.ts"), "utf8");

  it("fails closed when the API key is missing (no implicit demo)", () => {
    expect(checkout).toMatch(/BAYARGG_DEMO_MODE\s*===\s*["']true["']/);
    expect(checkout).toMatch(/status\(500\)/);
  });

  it("posts to the Bayar GG create-payment endpoint with X-API-Key", () => {
    expect(checkout).toMatch(/create-payment\.php/);
    expect(checkout).toMatch(/X-API-Key/);
  });
});
