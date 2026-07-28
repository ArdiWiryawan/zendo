# Design System for Monk Mode PWA

## Philosophy

Reflecting the "Monk Mode" philosophy:
- **Minimalism:** Clean, uncluttered interfaces.
- **Focus:** Clear visual hierarchy, guiding the user to one primary action/piece of information per screen.
- **Calmness:** Muted color palette, ample whitespace, readable typography.
- **Intentionality:** Every element serves a purpose; no decorative noise.

## Global Layout & Spacing

*   **Canvas:** Optimized for mobile-first, typically `393 × 852 px` (as per `screen_spec.md`).
*   **Horizontal Padding:** `20px` (consistent, for content inset).
*   **Bottom Padding:** `96px` (when bottom navigation is present).
*   **Section Gap:** `24px` (consistent vertical spacing between major content blocks).
*   **Card Radius:** `20px` (default rounded corners for most cards/containers). `rounded-monk`
*   **Important Card Radius:** `28px` (for prominent cards, e.g., Today Focus Card). `rounded-monk-lg`
*   **Whitespace:** Generous use of whitespace to reduce cognitive load and visual clutter.

## Color Palette

Defined via CSS variables in `src/styles/globals.css` and mapped in `tailwind.config.js`.

*   **Background Colors:**
    *   `monk-bg`: `#080908` (Darkest background)
    *   `monk-bg-deep`: `#040504` (Even darker, for deep backgrounds)
    *   `monk-surface`: `#111211` (Default surface, e.g., for cards)
    *   `monk-soft`: `#171917` (Slightly lighter surface, for subtle differentiation)
    *   `monk-raised`: `#1F221F` (Elevated surface, for more prominent cards)
*   **Text Colors:**
    *   `monk-text`: `#E5E2DA` (Primary text color)
    *   `monk-muted`: `#908C83` (Secondary text, descriptions)
    *   `monk-text-soft`: `#68655E` (Subtle text, placeholders)
*   **Border Colors:**
    *   `monk-border`: `#1B1D1B` (Default border)
    *   `monk-border-strong`: `#252825` (Stronger border, for emphasis)
*   **Accent Color:**
    *   `monk-accent`: `#A48B5E` (Primary brand accent, for CTAs, active states)
    *   `monk-accent-soft`: `#1C1914` (Soft accent background, for selected states)
*   **Semantic Colors:**
    *   `monk-success`: `#647B5E` (Success messages/indicators)
    *   `monk-success-soft`: `#171E15` (Soft success background)
    *   `monk-warning`: `#9B7846` (Warning messages/indicators)
    *   `monk-warning-soft`: `#201A12` (Soft warning background)
    *   `monk-danger`: `#9E5649` (Danger/error messages/indicators)
    *   `monk-danger-soft`: `#221412` (Soft danger background)
    *   `monk-rest`: `#5A6772` (Specific color for rest day/state)
    *   `monk-rest-soft`: `#14171A` (Soft rest background)

## Typography

*   **Font Family:**
    *   `sans`: `'Outfit'`, fallback to `ui-sans-serif`, `system-ui`, `sans-serif`. (Primary UI font)
    *   `mono`: `'IBM Plex Mono'`, fallback to `ui-monospace`, `SFMono-Regular`, `monospace`. (For code, tabular data)
    *   `handwriting`: `'Caveat'`, fallback to `cursive`. (For journal entries, decorative text)
*   **Hierarchy (Examples from `ui.tsx` and general usage):**
    *   `h1`: `text-[1.75rem] font-bold leading-10 tracking-tight sm:text-3xl` (PageHeader title)
    *   `h2`: `text-lg font-semibold leading-7` (SectionHeader title)
    *   `body-base`: Default text size.
    *   `body-sm`: `text-sm leading-6` (Descriptions, subcopy, `TextInput` text)
    *   `body-xs`: `text-xs` (StepIndicator, small labels)
*   **Line Height:** Optimized for readability, typically `1.5` for body text (`leading-relaxed`, `leading-6`).
*   **Text Alignment:** Primarily left-aligned; centered for prominent statements (mantras, splash screen).

## Spacing Scale

Based on Tailwind's default spacing scale (`4px` increments) and explicit values:
*   `px-6`: `24px` horizontal padding (global).
*   `mb-2`: `8px` margin-bottom.
*   `gap-3`: `12px` gap.
*   `p-5`: `20px` padding.
*   `Section Gap`: `24px`.

## Components

### Buttons

*   **Primary Button (`PrimaryButton`):**
    *   `background-color: monk-accent` with `linear-gradient` (`rgba(255, 255, 255, 0.22)` sheen)
    *   `text-color: monk-bg`
    *   `border-radius: rounded-monk` (`24px`)
    *   `min-height: 12` (`48px`)
    *   Shadow: `0 6px 18px -6px rgba(164, 139, 94, 0.45)` (accent glow)
    *   States: `active:scale-[0.98]`, `disabled:opacity-40`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg`
*   **Secondary Button (`SecondaryButton`):**
    *   `background-color: monk-soft`
    *   `text-color: monk-text`
    *   `border: 1px solid monk-border`
    *   `border-radius: rounded-monk` (`24px`)
    *   `min-height: 12` (`48px`)
    *   Shadow: `inset 0 1px 0 rgba(255,255,255,0.03)`
    *   States: `active:scale-[0.98]`, `enabled:hover:border-monk-border-strong enabled:hover:bg-monk-raised`, `disabled:opacity-45`, `focus-visible` (same as Primary)
*   **Ghost Button (`GhostButton`):**
    *   `background-color: Transparent`
    *   `text-color: monk-muted`
    *   `border-radius: rounded-full`
    *   `min-height: 11` (`44px`)
    *   States: `active:scale-[0.98]`, `enabled:hover:text-monk-text`, `disabled:opacity-45`, `focus-visible` (same as Primary)

### Input Fields (`TextInput`, `Textarea`)

*   `background-color: monk-surface`
*   `border: 1px solid monk-border`
*   `border-radius: rounded-xl` (`12px`)
*   `min-height: 12` (`48px`) for `TextInput`, `min-h-[120px]` for `Textarea`
*   `text-color: monk-text`, `placeholder:text-monk-text-soft`
*   States: `focus:border-monk-accent focus:outline-none focus:ring-1 focus:ring-monk-accent/40`

### Cards (`Card`)

*   `background-color: monk-surface` (default) or `monk-soft` (for `EmptyState`)
*   `border-radius: rounded-monk` (`24px`) or `rounded-monk-lg` (`32px`) for `important` cards.
*   Shadow: `monk-depth` (default) or `monk-depth-raised` (important).
    *   `monk-depth`: `inset 0 1px 0 rgba(255, 255, 255, 0.045), 0 1px 2px rgba(0, 0, 0, 0.32), 0 14px 30px -18px rgba(0, 0, 0, 0.7);`
    *   `monk-depth-raised`: `inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 2px 4px rgba(0, 0, 0, 0.34), 0 22px 44px -22px rgba(0, 0, 0, 0.72);`

### Choice Chips (`ChoiceChip`)

*   `default`: `border-monk-border bg-monk-surface text-monk-muted hover:border-monk-border-strong`
*   `selected`: `border-monk-accent bg-monk-accent-soft font-semibold text-monk-accent`
*   `border-radius: rounded-full`
*   `min-height: 11` (`44px`)

### Choice Cards (`ChoiceCard`)

*   `default`: `border-monk-border bg-monk-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-monk-border-strong`
*   `selected`: `border-monk-accent bg-monk-accent-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_-14px_rgba(164,139,94,0.55)]`
*   `border-radius: rounded-monk` (`24px`)
*   `min-height: 14` (`56px`)

### Navigation (`BottomNav`)

*   `monk-glass` effect: `background-color: color-mix(in srgb, var(--color-surface) 82%, transparent); backdrop-filter: blur(16px) saturate(1.1);`
*   `border: border-monk-border-strong`
*   `shadow-calm`: `0 8px 24px rgba(21, 21, 21, 0.06)`
*   Active tab: `bg-monk-accent-soft text-monk-accent ring-1 ring-monk-accent/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`
*   Inactive tab: `text-monk-text-soft hover:text-monk-muted`

## Iconography

*   **Source:** `lucide-react` (indicated by imports in `ui.tsx`).
*   **Style:** Minimalist, line icons.
*   **Color:** Inherits text colors, or specific colors like `monk-accent`, `monk-muted`.
*   **Size:** Standardized in `ui.tsx` (e.g., `size={16}`, `size={18}`, `size={20}`).

## Imagery

*   Not explicitly defined, but `global.css` has `radial-gradient` backgrounds that create subtle visual interest.

## Motion & Animation

*   **Transitions:** `transition duration-150 ease-monk` applied to interactive elements.
*   `ease-monk` not explicitly defined but implies a custom cubic-bezier.
*   `active:scale-[0.98]` for press feedback.
*   Page transitions (`page-enter`) use `slideIn` keyframe animation (`0.22s cubic-bezier(0.22, 1, 0.36, 1)`).
*   `animate-monk-pulse` for loading states (`1.4s ease-in-out infinite`).

## Accessibility

*   **Color Contrast:** Assumed to meet WCAG AA, given the dark theme and muted accent.
*   **Touch Targets:** `min-h-12`, `min-h-11`, `min-h-14` ensure sufficient touch area.
*   **Semantic HTML:** `role`, `aria-label`, `aria-modal`, `aria-labelledby`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-pressed` used.
*   **Focus Management:** Keyboard navigation implemented in `CalmDialog` and global `focus-visible` outlines.

This document now captures the implicit design system based on code analysis, providing a concrete reference for future development and auditing.