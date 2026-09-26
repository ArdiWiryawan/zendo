/**
 * QRIS (Quick Response Code Indonesian Standard) Dynamic Generator & EMVCo Specification Utility.
 * Converts static QRIS string into dynamic QRIS with custom amount and CRC16 checksum.
 */

export const QRIS_MERCHANT_STORAGE_KEY = "zendo_merchant_qris_v1";
export const QRIS_WA_STORAGE_KEY = "zendo_merchant_wa_v1";

// Default Zendo Official QRIS (Ardi Wiryawan, Digital & Kreatif - NMID: ID1026507210023)
export const DEFAULT_STATIC_QRIS =
  "00020101021126610014COM.GO-JEK.WWW01189360091438301868240210G8301868240303UMI51440014ID.CO.QRIS.WWW0215ID10265072100230303UMI5204899953033605802ID5924ARDI WIRYAWAN, Digital &6008SURABAYA61056021362070703A0163044B64";

/**
 * Computes CRC16-CCITT (False: poly 0x1021, init 0xFFFF)
 */
export function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  let hex = (crc & 0xffff).toString(16).toUpperCase();
  while (hex.length < 4) hex = "0" + hex;
  return hex;
}

/**
 * Converts a static QRIS string into dynamic QRIS with exact amount.
 */
export function convertToDynamicQRIS(
  staticQRIS: string = DEFAULT_STATIC_QRIS,
  amount: number,
  invoiceId?: string
): string {
  let raw = (staticQRIS || DEFAULT_STATIC_QRIS).trim();

  // Strip existing CRC if present at the end
  raw = raw.replace(/6304[A-Fa-f0-9]{4}$/, "").replace(/6304$/, "");

  // Step 1: Replace Point of Initiation Method: 010211 (static) -> 010212 (dynamic)
  if (raw.includes("010211")) {
    raw = raw.replace("010211", "010212");
  } else if (!raw.includes("010212")) {
    raw = raw.replace(/^000201/, "000201010212");
  }

  // Step 2: Format Transaction Amount (Tag 54)
  const amountStr = Math.round(amount).toString();
  const amountLen = String(amountStr.length).padStart(2, "0");
  const amountTag = "54" + amountLen + amountStr;

  // If Tag 54 already exists, replace it; else insert before Country Code (58) or Currency (53)
  if (/54\d{2}\d+/.test(raw)) {
    raw = raw.replace(/54\d{2}\d+/, amountTag);
  } else if (raw.includes("5802ID")) {
    raw = raw.replace("5802ID", amountTag + "5802ID");
  } else if (raw.includes("5303360")) {
    raw = raw.replace("5303360", "5303360" + amountTag);
  } else {
    raw = raw + amountTag;
  }

  // Step 3: Optional Additional Data (Tag 62) for Invoice / Bill Ref
  if (invoiceId) {
    const cleanInv = invoiceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    const subTag = "01" + String(cleanInv.length).padStart(2, "0") + cleanInv;
    const tag62 = "62" + String(subTag.length).padStart(2, "0") + subTag;
    if (/62\d{2}.*/.test(raw)) {
      raw = raw.replace(/62\d{2}[^6]*/, tag62);
    } else {
      raw = raw + tag62;
    }
  }

  // Step 4: Append CRC tag prefix (6304) and compute CRC16
  const payloadBeforeCRC = raw + "6304";
  const checksum = calculateCRC16(payloadBeforeCRC);

  return payloadBeforeCRC + checksum;
}

/**
 * Get customized merchant static QRIS from storage or fallback to default
 */
export function getSavedMerchantQRIS(): string {
  if (typeof localStorage === "undefined") return DEFAULT_STATIC_QRIS;
  try {
    return localStorage.getItem(QRIS_MERCHANT_STORAGE_KEY) || DEFAULT_STATIC_QRIS;
  } catch {
    return DEFAULT_STATIC_QRIS;
  }
}

export function saveMerchantQRIS(qrisString: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!qrisString.trim()) {
      localStorage.removeItem(QRIS_MERCHANT_STORAGE_KEY);
    } else {
      localStorage.setItem(QRIS_MERCHANT_STORAGE_KEY, qrisString.trim());
    }
  } catch {
    /* ignore */
  }
}

/**
 * Get customized WhatsApp confirmation number
 */
export function getSavedMerchantWhatsApp(): string {
  if (typeof localStorage === "undefined") return "6281234567890";
  try {
    return localStorage.getItem(QRIS_WA_STORAGE_KEY) || "6281234567890";
  } catch {
    return "6281234567890";
  }
}

export function saveMerchantWhatsApp(phone: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const clean = phone.replace(/[^0-9]/g, "");
    if (clean) localStorage.setItem(QRIS_WA_STORAGE_KEY, clean);
    else localStorage.removeItem(QRIS_WA_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Generates WhatsApp direct confirmation URL with pre-filled message
 */
export function generateWhatsAppConfirmationUrl(
  phone: string = getSavedMerchantWhatsApp(),
  invoiceId: string,
  planTitle: string,
  amount: number
): string {
  const targetPhone = (phone || "6281234567890").replace(/[^0-9]/g, "");
  const msg = [
    "Halo Mas Ardi Wiryawan,",
    "",
    "Saya baru saja mengirimkan donasi/dukungan untuk pengembangan aplikasi Zendo:",
    "- Ref ID: " + invoiceId,
    "- Jenis Dukungan: " + planTitle,
    "- Total Donasi: Rp " + amount.toLocaleString("id-ID"),
    "- Tanggal: " + new Date().toLocaleDateString("id-ID"),
    "",
    "Semoga Zendo terus berkembang dan bermanfaat untuk fokus monk mode banyak orang. Semangat berkarya!",
  ].join("\n");
  return "https://wa.me/" + targetPhone + "?text=" + encodeURIComponent(msg);
}
