# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check then build to dist/
npm run preview   # Preview production build locally
```

There is no lint or test script configured.

## Stack

- **Framework:** Solid.js (not React — uses `solid-js` reactivity, JSX via `vite-plugin-solid`)
- **Build:** Vite 8
- **Styling:** Tailwind CSS v4 (imported via `@tailwindcss/vite` plugin, no `tailwind.config.js` needed)
- **Language:** TypeScript (strict mode, target ES2023)

## Architecture

Single-page app with a minimal entry chain:

1. `index.html` — mounts `<div id="root">`, loads Geist font
2. `src/index.tsx` — renders `<App />` into `#root`
3. `src/App.tsx` — main component (currently a placeholder)

Styles: `src/index.css` sets global font; `src/App.css` imports Tailwind.

Public icon sprites are in `public/icons.svg` and `public/favicon.svg`.

## Solid.js Notes

Solid.js is reactive but **not React**. Key differences:
- Components run once; reactivity uses `createSignal`, `createEffect`, `createMemo`
- No virtual DOM — direct DOM updates
- JSX `jsxImportSource` is `solid-js` (set in `tsconfig.app.json`)
- Use `For`, `Show`, `Switch` control-flow components instead of `.map()` or ternaries where possible
