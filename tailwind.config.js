/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // All Tailwind colors map to the V2 CSS variables so there is
        // exactly one source of truth. Use e.g. `bg-ground`, `text-soft`.
        void: 'var(--em-void)',
        ground: 'var(--em-ground)',
        surface: 'var(--em-surface)',
        elevated: 'var(--em-elevated)',
        hairline: 'var(--em-hairline)',
        'hairline-strong': 'var(--em-hairline-strong)',
        bright: 'var(--em-bright)',
        soft: 'var(--em-soft)',
        muted: 'var(--em-muted)',
        faint: 'var(--em-faint)',
        brass: 'var(--em-brass)',
        'brass-bright': 'var(--em-brass-bright)',
        'brass-deep': 'var(--em-brass-deep)',
        gain: 'var(--em-gain)',
        loss: 'var(--em-loss)',
        watch: 'var(--em-watch)',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        num: ['"Geist Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        control: 'var(--em-radius-control)',
        panel: 'var(--em-radius-panel)',
        focal: 'var(--em-radius-focal)',
      },
      transitionTimingFunction: {
        lux: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      maxWidth: {
        content: '1180px',
      },
      boxShadow: {
        // Depth via tone, not heavy drop shadows (V2 rule).
        panel: '0 1px 0 rgba(0,0,0,0.25)',
        elevated: '0 8px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
