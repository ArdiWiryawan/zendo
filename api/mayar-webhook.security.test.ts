import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Self-check: the Mayar webhook must FAIL CLOSED and verify every request.
// Rejects a regression that re-introduces silent/optional authentication.
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "mayar-webhook.ts"), "utf8");

describe("mayar-webhook security invariants", () => {
  it("requires MAYAR_WEBHOOK_SECRET (fails closed, not optional)", () => {
    expect(src).toMatch(/process\.env\.MAYAR_WEBHOOK_SECRET/);
    expect(src).not.toMatch(/if\s*\(\s*secret\s*\)\s*\{/); // old optional-secret guard
    expect(src).toMatch(/status\(503\)/); // misconfigured -> 503
  });

  it("compares the secret in constant time", () => {
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

describe("mayar-checkout fail-closed invariant", () => {
  const checkout = readFileSync(join(__dirname, "mayar-checkout.ts"), "utf8");

  it("fails closed when the API key is missing (no implicit demo)", () => {
    expect(checkout).toMatch(/MAYAR_DEMO_MODE\s*===\s*["']true["']/);
    expect(checkout).toMatch(/status\(500\)/);
  });
});
