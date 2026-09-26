// Screen WakeLock utility to prevent phone/desktop screens from dimming or sleeping
// during an active focus or timer session.

let wakeLockSentinel: any = null;

export async function requestWakeLock(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
    return false;
  }
  try {
    if (!wakeLockSentinel || wakeLockSentinel.released) {
      wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinel.addEventListener("release", () => {
        wakeLockSentinel = null;
      });
    }
    return true;
  } catch {
    // WakeLock request can fail if battery saver is on or document not active
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel && !wakeLockSentinel.released) {
    try {
      await wakeLockSentinel.release();
    } catch {
      /* ignore */
    } finally {
      wakeLockSentinel = null;
    }
  }
}
