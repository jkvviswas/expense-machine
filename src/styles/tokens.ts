/**
 * Expense Machine — Design System V2 Tokens
 * "Dark Editorial Luxury"
 *
 * This file is the single TypeScript source of truth for the approved
 * Design System V2. It mirrors the CSS custom properties defined in
 * `theme.css`. Import these when you need token values in logic
 * (charts, motion, computed styles). For styling, prefer the Tailwind
 * classes / CSS variables that consume the same values.
 *
 * RULES (do not violate without re-approving the design system):
 *  - The dark ground is WARM-shifted, never blue-black.
 *  - Brass is the ONE accent. It must stay scarce (~4% of pixels).
 *  - Money colors (gain/loss/watch) are for financial data ONLY.
 *  - There is no blue, teal, indigo, or violet.
 */

export const color = {
  // Ground — the dark canvas (warm-shifted)
  void: '#0b0a09',
  ground: '#13110f',
  surface: '#1a1714',
  elevated: '#221e1a',
  hairline: '#2c2722',
  hairlineStrong: '#3a342d',

  // Light — rationed warm whites
  bright: '#f3ede3',
  soft: '#c8bfb0',
  muted: '#8a8175',
  faint: '#5f574d',

  // The accent — warm brass (used almost never)
  brass: '#c9a567',
  brassBright: '#e3c489',
  brassDeep: '#8a7142',

  // Money — semantic, data only
  gain: '#7fa382',
  loss: '#c08571',
  watch: '#c9a567',
} as const;

export const glow = {
  // The single ambient halo (brass at low alpha)
  brass: 'rgba(201, 165, 103, 0.14)',
  brassFocal: 'rgba(201, 165, 103, 0.20)',
} as const;

export const radius = {
  control: '11px', // buttons, inputs, tags
  panel: '16px', // cards, panels, modals
  focal: '999px', // the Clarity Moment only
} as const;

/** 8px base spacing scale (px). */
export const space = [8, 16, 24, 32, 48, 72, 96] as const;

export const font = {
  serif: '"Fraunces", Georgia, serif', // display / voice
  sans: '"Inter", system-ui, sans-serif', // UI / body
  mono: '"IBM Plex Mono", ui-monospace, monospace', // money / metadata
} as const;

export const type = {
  hero: { size: '4.25rem', weight: 400, tracking: '-0.02em' },
  pageTitle: { size: '2.125rem', weight: 400, tracking: '-0.015em' },
  section: { size: '1.375rem', weight: 600, tracking: '-0.005em' },
  cardTitle: { size: '1.0625rem', weight: 600, tracking: '0' },
  body: { size: '1rem', weight: 400, tracking: '0' },
  caption: { size: '0.75rem', weight: 400, tracking: '0.1em' },
} as const;

/**
 * Motion — V2 rule: stillness is the default.
 * One luxury easing curve. Nothing bounces. Nothing is fast.
 */
export const motion = {
  ease: [0.22, 1, 0.36, 1] as const, // the one easing curve
  durationSnappy: 0.4,
  durationBase: 0.7,
  durationSlow: 1.2,
  stagger: 0.075, // 75ms between staggered children
} as const;

export const layout = {
  sidebarWidth: 264,
  sidebarCollapsedWidth: 76,
  headerHeight: 68,
  contentMaxWidth: 1180,
} as const;

export type ColorToken = keyof typeof color;
