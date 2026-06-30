# 📄 ImgToPdf

A fast, lightweight web app that converts multiple images into a single PDF — entirely in your browser. Nothing is uploaded to a server; all processing happens client-side, with heavy compression offloaded to a background thread so the UI never stalls.

## What It Does

1. **Add images** — drag-and-drop or click to browse. Files are validated by type and size as they're added.
2. **Arrange** — preview every image and drag to reorder pages before generating.
3. **Choose quality** — pick how the PDF should be encoded (see below).
4. **Generate** — each page is sized to its source image's exact pixel dimensions with per-page portrait/landscape orientation; no letterboxing. Compression runs off the main thread.
5. **Download** — the PDF saves automatically with a timestamped filename (`imgtopdf-YYYYMMDD-HHMMSS.pdf`).

## Quality & Size Modes

| Mode | Behavior |
|------|----------|
| **Original Quality** | Embeds source images as-is, no re-encoding |
| **High Quality** | Re-encodes each image at fixed JPEG quality (0.85), full resolution; keeps the original if re-encoding would be larger |
| **Small (5 MB)** | Caps the whole PDF at ~5 MB |
| **Tiny (2 MB)** | Caps the whole PDF at ~2 MB |

For the size-capped modes, each image gets a share of the total byte budget. The compressor binary-searches JPEG quality to fit, and **downscales resolution** once quality hits its floor (resolution becomes the bottleneck for large, detailed images). Leftover budget from images that came in small is **redistributed** to images that maxed out their share, then those are re-compressed at the larger budget — so the byte budget is spent where it improves quality most.

## Constraints

| Constraint | Value |
|-----------|-------|
| Max images per session | 50 |
| Max file size per image | 15 MB |
| Supported formats | JPEG, PNG, WebP, GIF, BMP |
| Processing | 100% client-side (no server, no upload) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Solid.js](https://solidjs.com) — fine-grained reactive UI, no virtual DOM |
| **Build Tool** | [Vite 8](https://vitejs.dev) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) |
| **Compression** | Web Worker + OffscreenCanvas (off-thread JPEG re-encoding) |
| **Drag & Drop** | [@thisbeyond/solid-dnd](https://github.com/thisbeyond/solid-dnd) (sortable reordering) |
| **Language** | TypeScript (strict mode, ES2023 target) |

## UI/UX

- Mobile-first responsive layout
- Light / dark theme toggle (persisted)
- Real-time file validation feedback
- Progress bar during PDF generation
- Drag-to-reorder image pages

## License

Built with ❤️ by Pritom — [LinkedIn](https://www.linkedin.com/in/purkayasta/)
