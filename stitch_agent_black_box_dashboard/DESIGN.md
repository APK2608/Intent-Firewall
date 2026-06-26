---
name: Agent Black Box
colors:
  surface: '#0e1511'
  surface-dim: '#0e1511'
  surface-bright: '#343b36'
  surface-container-lowest: '#09100c'
  surface-container-low: '#161d19'
  surface-container: '#1a211d'
  surface-container-high: '#242c27'
  surface-container-highest: '#2f3632'
  on-surface: '#dde4dd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dde4dd'
  inverse-on-surface: '#2b322d'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ffb3b6'
  on-secondary: '#68001a'
  secondary-container: '#cc003c'
  on-secondary-container: '#ffdcdc'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b6'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920028'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#0e1511'
  on-background: '#dde4dd'
  surface-variant: '#2f3632'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  code-xs:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-sm: 24px
  margin-lg: 48px
  container-max: 1440px
---

## Brand & Style
The design system for this product is rooted in **Cybernetic Minimalism**. It positions the interface as a high-integrity trust layer, evoking a sense of absolute precision, security, and technical authority. The target audience—security researchers, automated agents, and system administrators—requires a high signal-to-noise ratio where critical data is prioritized over decorative elements.

The visual style utilizes a **Terminal-Modern** hybrid. It combines the structured efficiency of developer tools with the polished clarity of high-end SaaS. Expect heavy use of whitespace (or "darkspace") to isolate critical alerts, thin 1px borders to define structural hierarchy, and "glowing" status indicators to provide immediate visual feedback on system health.

## Colors
The palette is optimized for long-duration monitoring in low-light environments. 
- **Emerald Green (#10b981):** Reserved exclusively for verified states, successful decryptions, and safe agent behaviors. 
- **Rose Crimson (#e11d48):** Used sparingly but aggressively for malicious intercepts, blocked packets, and critical system failures.
- **Foundation:** The background utilizes a deep Zinc-Charcoal (#0a0a0a) to ensure the emerald and rose accents achieve maximum "pop" without color bleed. 
- **Accents:** Use low-opacity tints of the primary colors (e.g., 10% opacity) for subtle glow effects behind high-priority status icons.

## Typography
This design system employs a dual-font strategy to separate intent:
- **UI & Navigation:** Uses **Geist** and **Inter**. These provide a clean, modern frame for the application, ensuring legibility in menus and settings.
- **Technical Data:** Uses **JetBrains Mono** for all variable data, including hashes, IP addresses, log streams, and agent logic. This monospaced font ensures that characters remain distinct (e.g., distinguishing `0` from `O`) which is vital for security auditing.
- **Hierarchy:** Maintain a strict contrast between labels (monospaced) and values (monospaced) or titles (sans-serif).

## Layout & Spacing
The system uses a **Rigid Grid** model based on a 4px baseline. Layouts are data-dense but logically grouped to prevent cognitive overload.
- **Desktop:** A 12-column grid with narrow 16px gutters to maximize horizontal space for log tables.
- **Sidebars:** Fixed-width left navigation (240px) and optional right-side inspector panels (320px).
- **Density:** Use compact spacing for log entries (4px vertical padding) to allow as much data as possible on a single screen without scrolling.
- **Alignment:** All technical data should be left-aligned for rapid scanning. Status indicators should be vertically centered within their rows.

## Elevation & Depth
In this dark, high-contrast environment, traditional shadows are replaced by **Tonal Layering** and **Subtle Outlines**:
- **Layer 0 (Base):** #0a0a0a - The primary background.
- **Layer 1 (Cards/Panels):** #171717 - Used for main content containers, defined by a 1px border of #262626.
- **Layer 2 (Popovers/Modals):** #1c1c1c - Elevated surfaces with a soft, 0.05 opacity emerald or crimson outer glow if the content is high-priority.
- **Interactive States:** Instead of raising elements on the Z-axis, use border-color shifts. An active input or hovered card should transition from #262626 to #404040.

## Shapes
The shape language is **Technical & Structured**. 
- UI elements use a "Soft" (0.25rem) radius to maintain a modern feel without becoming "bubbly" or consumer-oriented. 
- Large containers and cards use `rounded-lg` (0.5rem) sparingly to frame the interface. 
- Status pips (the glowing indicators) are the only fully circular elements, used to denote activity or "pulse."

## Components
- **Buttons:** Primary actions are ghost-style with Emerald borders and text. Critical "Danger" actions (e.g., Purge Logs) use a solid Crimson background with white text.
- **Status Indicators:** Small 8px circles. Use a CSS `box-shadow` with a 4px blur of the status color to create a "glow" effect, suggesting the agent is "live."
- **Data Tables:** No vertical borders. Use 1px horizontal dividers in #171717. The header row should use `code-xs` typography for a "terminal" aesthetic.
- **Input Fields:** Darker than the background (#050505) with 1px borders. The focus state uses an Emerald border and a very subtle inner Emerald glow.
- **Chips/Badges:** Monospaced text, 10% opacity background of the status color (Emerald or Rose), and 100% opacity text.
- **Code Blocks:** Deep black background, no rounding, strictly monospaced with syntax highlighting favoring the Emerald/Rose/Zinc palette.