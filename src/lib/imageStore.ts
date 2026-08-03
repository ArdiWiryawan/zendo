// Local image store for notebook photos.
//
// IndexedDB holds raw Blobs (no base64 inflation, no localStorage 5MB ceiling),
// keyed by id. Images are intentionally NOT synced to any remote backend —
// text-only sync (see lib/supabase.ts). Offline-safe: IndexedDB is native PWA
// storage.
//
// ponytail: swap to the `idb` package only if cursor/iteration queries are ever
// needed; the put/get/delete surface here needs no dependency.

const DB_NAME = "zendo_images";
const STORE = "images";
const VERSION = 1;

let _dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("failed to open image db"));
  });
  return _dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb request failed"));
  });
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE, "readwrite");
  await request(tx.objectStore(STORE).put(blob, id));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("transaction failed"));
  });
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const db = await open();
  const tx = db.transaction(STORE, "readonly");
  return request(tx.objectStore(STORE).get(id) as IDBRequest<Blob | undefined>);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE, "readwrite");
  await request(tx.objectStore(STORE).delete(id));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("transaction failed"));
  });
}

/** A line in the notebook body that embeds a photo at that position (Word-like block). */
export const IMG_MARKER = /^{{img:([0-9A-Za-z_-]+)}}$/;

/** Collect the photo ids referenced by {{img:…}} markers in a body string. */
export function matchImageMarkers(body: string): Set<string> {
  const ids = new Set<string>();
  for (const line of body.split("\n")) {
    const m = line.trim().match(IMG_MARKER);
    if (m) ids.add(m[1]);
  }
  return ids;
}

/** Largest key allowed after compression; keeps IndexedDB usage + list render fast. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Downscale + compress an image File to a JPEG Blob for storage.
 * ~150–400KB per phone photo instead of the raw 2–4MB.
 * Falls back to the original file when decoding fails.
 */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
