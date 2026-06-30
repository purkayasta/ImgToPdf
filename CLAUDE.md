# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then build to dist/
npm run preview   # Preview production build locally
npm run deploy    # Build then publish dist/ to GitHub Pages (gh-pages)
```

There is no lint or test script configured.

## Stack

- **Framework:** Solid.js (not React — uses `solid-js` reactivity, JSX via `vite-plugin-solid`)
- **Build:** Vite 8
- **Styling:** Tailwind CSS v4 (imported via `@tailwindcss/vite` plugin, no `tailwind.config.js` needed)
- **Language:** TypeScript (strict mode, target ES2023)
- **PDF Generation:** jsPDF
- **Background Tasks:** Web Workers (for image compression)
- **Drag & Drop:** `@thisbeyond/solid-dnd` (sortable image reordering)

## Architecture

**Image-to-PDF Converter** — converts multiple images into a single PDF with optional compression.

### Entry chain
1. `index.html` — mounts `<div id="root">`, loads Geist font
2. `src/index.tsx` — renders `<App />` into `#root`
3. `src/App.tsx` — state container managing:
   - `images[]` — array of `ImageFile` (with file, preview URL, metadata)
   - `isGenerating` — tracks PDF generation in progress
   - `progress` — 0–100 driven during generation (see Progress Bar below)
   - `sizeOption` — selected quality/size target (`PdfSizeOption`: `'default'`, `'high'`, `'2mb'`, `'5mb'`); dropdown choices come from `PdfService.getSizeChoices()`
   - The size-target `<select>` and the action buttons are inlined here, not separate components.

### Components (`src/components/`)
- **UploadZone** — drag-drop or click to add images (`compact` prop shrinks it once images exist)
- **ImageList** — sortable grid of image previews; handles drag-to-reorder and per-card remove (see below)
- **Button** — single generic button (label/icon/variant/loading); used for both Clear All and Generate PDF
- **Navbar** — header with title, light/dark theme toggle (persisted to `localStorage` under `theme`), and the generation progress bar

### Services (`src/services/`)
- **ImageService** — validates files (type & size), creates `ImageFile` objects
  - Accepts: JPEG, PNG, WebP, GIF, BMP (15 MB per image, max 50 images)
- **PdfService** — orchestrates PDF generation:
  - Each PDF page is sized to the source image's exact pixel dimensions (no letterboxing); orientation is derived per-page from width vs. height
  - Loads + compresses all images in parallel (`Promise.all`); jsPDF page operations run sequentially afterward
  - Three modes by `sizeOption`:
    - `'default'` — embed originals, no re-encode
    - `'high'` — quality-driven: re-encode each image at fixed `HIGH_QUALITY` (0.85) full-res; if the result is larger than the source, embed the original instead. Not byte-capped.
    - `'2mb'` / `'5mb'` — size-driven: whole-PDF cap in `FIXED_TARGET_BYTES`; per-image byte budget = `(target − 75 KB overhead) / imageCount`, compressed off-thread
  - **Budget redistribution** (size-driven only): after the first parallel pass, images that landed well under their equal share free up bytes; that leftover is split among "saturated" images (≥95% of budget) and only those are re-compressed at the larger budget
  - Saves PDF with timestamp filename (`imgtopdf-YYYYMMDD-HHMMSS.pdf`)

### Web Worker
- **compress.worker.ts** — runs image compression on background thread; two mutually-exclusive input modes:
  - `{ quality }` — one re-encode at full resolution, fixed JPEG quality (used by `'high'`)
  - `{ targetBytes }` — fit a byte budget: first probe `MIN_QUALITY` (0.5) at current size; if even that overshoots, **downscale** dimensions by `sqrt(target/size)` and retry (resolution is the bottleneck once quality floors out), down to a `MIN_DIMENSION` (100px) floor; once min quality fits, binary-search quality upward within budget
  - Draws image on OffscreenCanvas with white background (handles PNG transparency)
  - Returns compressed JPEG as `Uint8Array`; empty buffer (no fit / error) is handled by `PdfService`'s try/catch downstream

### Styles
`src/index.css` sets global font; `src/App.css` imports Tailwind.
Public icon sprites in `public/icons.svg` and `public/favicon.svg`.

## Coding Principles

These are non-negotiable for any change in this repo:

1. **Performance first** — the site must stay as fast as possible, no compromise. Keep work off the main thread (Web Workers), avoid unnecessary re-renders, prefer transfers over copies for large data, and don't add dependencies or work that slow load or interaction.
2. **Mobile first** — design and style for small screens first, then scale up with responsive breakpoints (`sm:`/`md:`/`lg:`). Touch targets and layouts must work on phones before desktop.
3. **Maintainable code** — clear names, match existing patterns, keep state in `App.tsx` and logic in services. Readability over cleverness.
4. **No overengineering** — minimum code that solves the problem. No speculative abstractions, config, or flexibility that wasn't asked for.

## Development Patterns

### Drag-to-Reorder
- `ImageList` wraps the grid in `DragDropProvider` / `SortableProvider` from `@thisbeyond/solid-dnd`; each card calls `createSortable(id)` and applies `use:sortable`
- The `use:sortable` directive is typed in `src/solid-dnd.d.ts` (augments `solid-js` `JSX.Directives`) — keep that file or TS errors on the directive
- `onDragEnd` calls back into `App.handleReorder(fromId, toId)`, which splices the `images` array; state stays in `App.tsx`
- Remove buttons inside a card call `e.stopPropagation()` on `onPointerDown` so a click doesn't start a drag

### Progress Bar
- `App.handleGenerate` runs an eased timer that creeps `progress` toward 90%, while real ticks from `PdfService`'s `onProgress` callback can push it higher (also capped at 90); it snaps to 100 only when generation finishes
- `PdfService` reports two ticks per image (load/compress, then add-to-PDF) via `onProgress`
- `Navbar` renders the bar from its `progress`/`isGenerating` props

### Resource Cleanup
- Blob URLs created by `URL.createObjectURL()` are revoked in `App.tsx`'s `onCleanup()`
- Web Workers are terminated after message handling to free threads
- This prevents memory leaks when adding/removing images or generating PDFs

### Service Objects
- Services (`ImageService`, `PdfService`) are singletons exported as plain objects
- They contain pure functions for validation, file handling, and PDF generation
- No internal state — state lives in Solid.js signals in `App.tsx`

### Worker Communication
- `compress.worker.ts` transfers the `ImageBitmap` (`postMessage(..., [bitmap])`) to avoid copying large pixel data; `bitmap.close()` releases it
- Byte-budget mode: up to `MAX_ATTEMPTS` (6) downscale passes, each with an 8-iteration quality binary search — balances quality precision with performance
- Worker errors are caught and logged; an empty (0-byte) buffer is posted back and triggers error handling downstream

## Solid.js Notes

Solid.js is reactive but **not React**. Key differences:
- Components run once; reactivity uses `createSignal`, `createEffect`, `createMemo`
- No virtual DOM — direct DOM updates
- JSX `jsxImportSource` is `solid-js` (set in `tsconfig.app.json`)
- Use `For`, `Show`, `Switch` control-flow components instead of `.map()` or ternaries where possible
