import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Drift guard for the duplicated premium-pack price maps. The server-side
// maps (api/mayar-checkout.ts, api/mayar-webhook.ts) must stay in sync with
// the client source of truth (src/constants/defaultData.ts). This test reads
// the raw sources (like mayar-webhook.security.test.ts) so it keeps working
// even though api/ and src/ live in different tsconfig projects.
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = readFileSync(join(root, "src/constants/defaultData.ts"), "utf8");
const checkout = readFileSync(join(__dirname, "mayar-checkout.ts"), "utf8");
const webhook = readFileSync(join(__dirname, "mayar-webhook.ts"), "utf8");

// "packId: priceRp" from each premium pack in src/constants/defaultData.ts.
// Splitting on the pack-id boundary (not a tempered dot, which `matchAll` can't
// backtrack past) isolates each pack block; a block with `isPremium: true` and
// a `priceRp` is premium. The `id: "pack_...",` anchor also excludes nested
// question ids (dd_1, ss_1, ...).
const packBlocks = src.split(/id: "(pack_[a-z0-9_]+)",/g);
// packBlocks: [before, id1, body1, id2, body2, ...]
const clientPrices: Record<string, number> = {};
for (let i = 1; i < packBlocks.length; i += 2) {
  const id = packBlocks[i];
  const body = packBlocks[i + 1];
  const isPremium = /isPremium:\s*true/.test(body);
  const price = body.match(/priceRp:\s*(\d+)/);
  if (isPremium && price) clientPrices[id] = Number(price[1]);
}

// "packId: price" from each server-side PACK_PRICES entry. The `[a-z0-9_]`
// class stops at the `:` delimiter so adjacent entries don't bleed together.
function serverPrices(file: string): Record<string, number> {
  return Object.fromEntries([...file.matchAll(/(pack_[a-z0-9_]+):\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
}

describe("PACK_PRICES parity", () => {
  it("server checkout prices match the client source of truth", () => {
    expect(serverPrices(checkout)).toEqual(clientPrices);
  });

  it("server webhook prices match the client source of truth", () => {
    expect(serverPrices(webhook)).toEqual(clientPrices);
  });
});
