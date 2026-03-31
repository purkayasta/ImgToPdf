# 📄 ImgToPdf

A fast, lightweight web application that converts multiple images into a single PDF with optional smart compression. Built with modern web technologies for optimal performance.

## ✨ Features

- **Batch Image Processing** — Convert up to 50 images in one session
- **Smart Compression** — Three compression modes: uncompressed, 5MB, or 20MB targets
- **Auto Page Orientation** — Automatically detects and applies portrait/landscape orientation per image
- **Off-Thread Compression** — Uses Web Workers to compress images without blocking the UI
- **Drag & Drop** — Simple drag-and-drop interface for adding images
- **Image Preview** — See all images before generating the PDF
- **Multi-Format Support** — JPEG, PNG, WebP, GIF, BMP (up to 15MB per image)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Solid.js](https://solidjs.com) — Lightweight reactive library |
| **Build Tool** | [Vite 8](https://vitejs.dev) — Lightning-fast bundler |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) — Utility-first CSS |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) — PDF creation library |
| **Language** | TypeScript (strict mode, ES2023 target) |
| **Background Tasks** | Web Workers — Offload heavy compression work |

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm, pnpm, or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```
Opens dev server at [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
npm run build
```
Outputs optimized bundle to `dist/`

### Preview Build

```bash
npm run preview
```
Test production build locally

## 📋 Architecture

```
App.tsx (State Container)
├── Navbar (Header)
├── UploadZone (Drag-drop interface)
├── ImageList (Preview thumbnails)
├── Toolbar (Generate, Clear, Size selector)
└── Services
    ├── ImageService (Validation)
    ├── PdfService (PDF generation)
    └── Workers (compress.worker.ts)
```

### How It Works

1. **Upload** — Drag images or click to browse (formats validated, max 15MB each)
2. **Preview** — See all selected images before processing
3. **Configure** — Choose PDF size target and compression level
4. **Generate** — Creates PDF with smart compression on background thread
5. **Download** — Automatically downloads with timestamp filename

### Compression Strategy

- **Binary search algorithm** finds optimal JPEG quality for target file size
- **10 iterations** provide precision within ~0.1% quality variance
- **Off-thread processing** keeps UI responsive during compression
- **PNG transparency** handled by compositing on white background

## 📦 Constraints

| Constraint | Value |
|-----------|-------|
| Max images per session | 50 |
| Max file size per image | 15 MB |
| PDF size targets | Uncompressed, 5MB, 20MB |
| Supported formats | JPEG, PNG, WebP, GIF, BMP |

## 🎨 UI/UX Highlights

- Dark/light mode support via Tailwind
- Responsive design (mobile-first)
- Real-time file validation feedback
- Progress indication during PDF generation
- Accessible drag-drop zone

## 📝 License

Built with ❤️ by Pritom
[LinkedIn](https://www.linkedin.com/in/purkayasta/)

## 🔗 Related

- [Solid.js Docs](https://solidjs.com/docs)
- [Vite Docs](https://vitejs.dev)
- [jsPDF Docs](https://github.com/parallax/jsPDF)
- [Tailwind CSS](https://tailwindcss.com)
