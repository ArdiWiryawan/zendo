import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        monk: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          soft: "var(--color-surface-soft)",
          text: "var(--color-text)",
          muted: "var(--color-text-muted)",
          "text-soft": "var(--color-text-soft)",
          border: "var(--color-border)",
          "border-strong": "var(--color-border-strong)",
          accent: "var(--color-accent)",
          "accent-soft": "var(--color-accent-soft)",
          success: "var(--color-success)",
          "success-soft": "var(--color-success-soft)",
          warning: "var(--color-warning)",
          "warning-soft": "var(--color-warning-soft)",
          danger: "var(--color-danger)",
          "danger-soft": "var(--color-danger-soft)",
          rest: "var(--color-rest)",
          "rest-soft": "var(--color-rest-soft)",
          deep: "var(--color-bg-deep)",
          raised: "var(--color-surface-raised)"
        }
      },
      borderRadius: {
        monk: "24px",
        "monk-lg": "32px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        calm: "0 8px 24px rgba(21, 21, 21, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
