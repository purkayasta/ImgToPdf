# CLAUDE.md

Contributor context for Claude Code. See also `AGENTS.md` for repository conventions.

## Commands

Use Node.js 22.18 or newer.

```bash
npm ci                    # Install locked dependencies
npm run dev               # Local app at /ImgToPdf/ on the printed Vite URL
npm run build             # Type-check and generate dist/
npm run preview           # Serve the production build locally
npm test                  # Node regression tests for PDF geometry, validation, and compression
npx playwright install chromium # One-time browser setup
npm run test:e2e           # Production browser tests for desktop and mobile viewports
npm run deploy            # Build and publish dist/ to GitHub Pages
```

There is no lint script. `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e` uses an installed Chrome instead of Playwright's Chromium. Deployment requires GitHub authentication and a public/noreply commit identity; use `npm run deploy -- --user 'Name <noreply-address>'` when the default Git email is private.

## Stack and Structure

- Solid.js with strict TypeScript, Vite, Tailwind CSS v4, jsPDF, and `@thisbeyond/solid-dnd`.
- `src/App.tsx` owns image selection, validation feedback, clear undo, generation, and cancellation.
- `src/types/pdf.ts` contains quality choices and progress types. Keep these independent of jsPDF so importing UI choices does not load the PDF bundle.
- `src/services/imageService.ts` validates type/size, verifies images load, checks dimensions, and generates thumbnails. Inputs are limited to 50 images, 15 MB each, 40 megapixels, and 32,767 pixels per side.
- `src/services/pdfService.ts` is dynamically imported when generation starts. It reads original File data and processes one image at a time, retaining no batch of decoded sources.
- `src/utils/pdf.ts` provides page geometry, size targets, and timestamped filenames. Pixel dimensions are interpreted at 96 dpi and scaled proportionally to the PDF page limit.
- `src/workers/compress.worker.ts` handles JPEG encoding on OffscreenCanvas. Quality mode uses 0.85; budget mode searches quality and reduces resolution, including narrow images. Errors are explicit messages, never empty/oversized fallback buffers.
- Original quality uses source bytes and lossless PDF stream compression. High quality uses the original when its encoded bytes are smaller. Size modes allocate the remaining byte budget across remaining pages and verify the final Blob before downloading.
- `src/App.css` defines shared controls, surfaces, focus treatment, and reduced-motion behavior. `src/index.css` sets the font.

## Interaction and Resource Handling

- Keep uploads, removal, reordering, and quality selection disabled during generation. Cancellation uses AbortController; workers terminate on success, errors, cancellation, or timeout.
- Image cards register their sortable ref on the card and pointer activators only on a dedicated drag handle. Keep move buttons as keyboard and single-pointer alternatives. Normal previews must allow touch scrolling.
- Thumbnails show full page content; the native dialog opens a single original image. Revoke its URL when closed.
- Revoke thumbnails on removal, when discarding clear undo, and on cleanup. Generation reads File objects rather than thumbnail URLs. Download Blob URLs are revoked after a short delay.
- Progress reports actual stages and completed pages. Keep a readable status, accessible progress values, visible errors, and useful focus after list changes.
- Theme storage is optional. Catch storage exceptions and fall back to system preference for the initial theme.

## Coding Principles

1. **Performance first:** bound decoded-image memory, transfer bitmaps and buffers, release resources, and keep PDF code off the initial load.
2. **Mobile first:** maintain 44px controls, full-page previews, normal scrolling, and reachable generation controls.
3. **Maintainable code:** keep state in Solid signals and processing in services; use `For` and `Show`, not React patterns.
4. **No overengineering:** keep dependencies and abstractions proportional to the task.
5. **Verify behavior:** run the build and Node tests; run browser regressions for upload, generation, ordering, or interaction changes. Tests live in `tests/`, browser artifacts are ignored.
