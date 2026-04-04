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
- **PDF Generation:** jsPDF
- **Background Tasks:** Web Workers (for image compression)

## Architecture

**Image-to-PDF Converter** — converts multiple images into a single PDF with optional compression.

### Entry chain
1. `index.html` — mounts `<div id="root">`, loads Geist font
2. `src/index.tsx` — renders `<App />` into `#root`
3. `src/App.tsx` — state container managing:
   - `images[]` — array of `ImageFile` (with file, preview URL, metadata)
   - `isGenerating` — tracks PDF generation in progress
   - `sizeOption` — selected PDF size target ('default', '5mb', '20mb')

### Components (`src/components/`)
- **UploadZone** — drag-drop or click to add images
- **ImageList** — displays image previews with remove buttons
- **GenerateButton** — triggers PDF generation
- **ClearAllButton** — clears all images
- **SizeSelector** — switches between size targets
- **Navbar** — header with title/info

### Services (`src/services/`)
- **ImageService** — validates files (type & size), creates `ImageFile` objects
  - Accepts: JPEG, PNG, WebP, GIF, BMP (15 MB per image, max 50 images)
- **PdfService** — orchestrates PDF generation:
  - Detects image orientation per-page (portrait/landscape)
  - Fits images with letterboxing to preserve aspect ratio
  - Compresses images off-thread (if size target set)
  - Saves PDF with timestamp filename

### Web Worker
- **compress.worker.ts** — runs image compression on background thread
  - Uses binary search to find optimal JPEG quality within target byte budget
  - Draws image on OffscreenCanvas with white background (handles PNG transparency)
  - Returns compressed JPEG as `Uint8Array`

### Styles
`src/index.css` sets global font; `src/App.css` imports Tailwind.
Public icon sprites in `public/icons.svg` and `public/favicon.svg`.

## Development Patterns

### Resource Cleanup
- Blob URLs created by `URL.createObjectURL()` are revoked in `App.tsx`'s `onCleanup()`
- Web Workers are terminated after message handling to free threads
- This prevents memory leaks when adding/removing images or generating PDFs

### Service Objects
- Services (`ImageService`, `PdfService`) are singletons exported as plain objects
- They contain pure functions for validation, file handling, and PDF generation
- No internal state — state lives in Solid.js signals in `App.tsx`

### Worker Communication
- `compress.worker.ts` uses `Transferable` objects to avoid copying large pixel data
- Binary search algorithm (10 iterations) balances quality precision with performance
- Worker errors are caught and logged; empty buffer triggers error handling downstream

## Solid.js Notes

Solid.js is reactive but **not React**. Key differences:
- Components run once; reactivity uses `createSignal`, `createEffect`, `createMemo`
- No virtual DOM — direct DOM updates
- JSX `jsxImportSource` is `solid-js` (set in `tsconfig.app.json`)
- Use `For`, `Show`, `Switch` control-flow components instead of `.map()` or ternaries where possible
