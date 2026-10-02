import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        monk: {
          // `rgb(var(--x) / <alpha-value>)` is REQUIRED here: the CSS vars are
          // space-separated RGB triplets, and an opacity modifier (`/80`) on a
          // plain `var()` color fails to resolve, silently emitting a default
          // palette color instead — e.g. `bg-monk-surface/80` became solid white.
          // Every token below is triplet-valued in globals.css (all 6 themes).
          bg: "rgb(var(--color-bg) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
          soft: "rgb(var(--color-surface-soft) / <alpha-value>)",
          text: "rgb(var(--color-text) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          "text-soft": "rgb(var(--color-text-soft) / <alpha-value>)",
          border: "rgb(var(--color-border) / <alpha-value>)",
          "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
          "accent-soft": "rgb(var(--color-accent-soft) / <alpha-value>)",
          success: "rgb(var(--color-success) / <alpha-value>)",
          "success-soft": "rgb(var(--color-success-soft) / <alpha-value>)",
          warning: "rgb(var(--color-warning) / <alpha-value>)",
          "warning-soft": "rgb(var(--color-warning-soft) / <alpha-value>)",
          danger: "rgb(var(--color-danger) / <alpha-value>)",
          "danger-soft": "rgb(var(--color-danger-soft) / <alpha-value>)",
          rest: "rgb(var(--color-rest) / <alpha-value>)",
          "rest-soft": "rgb(var(--color-rest-soft) / <alpha-value>)",
          "cat-deep": "rgb(var(--color-cat-deep) / <alpha-value>)",
          "cat-shallow": "rgb(var(--color-cat-shallow) / <alpha-value>)",
          "cat-learning": "rgb(var(--color-cat-learning) / <alpha-value>)",
          "cat-rest": "rgb(var(--color-cat-rest) / <alpha-value>)",
          "cat-personal": "rgb(var(--color-cat-personal) / <alpha-value>)",
          deep: "rgb(var(--color-bg-deep) / <alpha-value>)",
          raised: "rgb(var(--color-surface-raised) / <alpha-value>)"
        }
      },
      borderRadius: {
        monk: "24px",
        "monk-lg": "32px"
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        soft: "0 4px 16px rgba(0, 0, 0, 0.18)",
        calm: "0 8px 24px rgba(21, 21, 21, 0.06)"
      },
      transitionTimingFunction: {
        monk: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
} satisfies Config;
