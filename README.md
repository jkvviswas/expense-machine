# Expense Machine — Application Shell

Production-ready foundation for Expense Machine, built on **Design System V2
(Dark Editorial Luxury)**. This is the shell only — App Layout, Sidebar, Header,
Navigation, Theme Tokens, and Route Structure. Dashboard widgets are intentionally
not built yet; routed pages render calm placeholders ready to receive real content.

## Stack
React 19 · TypeScript · Vite · Tailwind CSS v3 · Framer Motion · React Router · lucide-react

## Run
```bash
npm install
npm run dev      # development
npm run build    # typecheck + production build
npm run preview  # preview the build
```

## Architecture

```
src/
  styles/
    tokens.ts            Design System V2 tokens as typed TS (logic source of truth)
  index.css              Theme: fonts, CSS variables (styling source of truth), grain, halo
  app/
    navigation.ts        Single source of truth for routes + sidebar items
    router.tsx           Route structure (all screens nested in AppLayout)
    shell-context.tsx    Sidebar collapse + mobile drawer state (persisted)
  components/
    layout/
      AppLayout.tsx       Desktop rail + animated mobile drawer + header + outlet
      Sidebar.tsx         Calm unlit spine; brass-tick active state; collapsible
      Header.tsx          Quiet bar: title/date, search, ONE brass action, profile
      PageStage.tsx       Per-view halo + staggered luxury entrance
    primitives/
      BrandMark.tsx       Halo-circle glyph + wordmark
  routes/
    pages.tsx            Thin route modules (Dashboard ready for widgets)
    PlaceholderPage.tsx  Calm scaffold using the single focal-ring language
    NotFoundPage.tsx     404
```

## Design System V2 — enforced in code
- **Warm-shifted dark ground** (`--em-ground: #13110f`), never blue-black.
- **One brass accent**, scarce. The only brass in the sidebar is the active tick.
- **One source of light**: a single ambient halo per view (`.em-halo`).
- **Money colors** (gain/loss) reserved for financial data only.
- **Type**: Fraunces (display) · Inter (UI) · IBM Plex Mono (figures).
- **Motion**: stillness is the default; one easing curve `cubic-bezier(.22,1,.36,1)`;
  staggered entrances; nothing bounces; honors `prefers-reduced-motion`.
- **Accessibility**: brass focus rings, AA-contrast text pairings, 44px targets.

## Next steps
- Mount the Clarity Moment (Safe-to-Spend focal ring) + Level-2 context band on `/`.
- Build the Import flow (`/import`) — the signature experience.
