const DISMISS_KEY = "zendo_pwa_install_dismissed_v1";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !!mq || ios;
}

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
  deferred = null;
  notify();
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function canShowInstallBanner(): boolean {
  return !!deferred && !isStandalone() && !isInstallDismissed();
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  deferred = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") dismissInstall();
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initPwaInstallCapture(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onBeforeInstall = (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
}
