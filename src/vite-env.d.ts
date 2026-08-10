/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// WICG Notification Triggers API — not in TS DOM lib yet.
// Used by focusNotifications.ts to schedule OS notifications while tab is closed.
// Runtime check `typeof NotificationTrigger !== "undefined"` feature-detects Chromium.
declare var NotificationTrigger: new (timestamp: string) => NotificationTrigger;
interface NotificationTrigger {}
interface NotificationOptions {
  showTrigger?: NotificationTrigger;
}
