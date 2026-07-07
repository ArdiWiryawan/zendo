/**
 * Haptic feedback utility — silent on desktop, vibration on mobile.
 */
export function hapticPress(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  if (!("vibrate" in navigator)) return;
  const patterns: Record<string, number[]> = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [50, 50, 50],
    warning: [100, 50, 100],
    error: [100, 50, 100, 50, 100]
  };
  navigator.vibrate(patterns[style] ?? patterns.light);
}
