# Repository Guidelines

## Project Structure & Module Organization

ImgToPdf is a browser-only Solid.js application built with TypeScript, Vite, Tailwind CSS v4, and jsPDF.

- `src/App.tsx` owns application state; `src/index.tsx` mounts the app.
- `src/components/` contains upload, sortable preview, navigation, and button components.
- `src/services/` handles image validation and PDF generation; `src/workers/compress.worker.ts` performs background compression.
- `src/types/` contains shared models; `src/solid-dnd.d.ts` declares the sortable JSX directive.
- `src/assets/` and `public/` contain assets; global styles live in `src/index.css` and `src/App.css`.
- `dist/` is generated output. No automated test directory currently exists.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server; use the printed URL with the `/ImgToPdf/` base path.
- `npm run build`: run TypeScript project checks and produce `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run deploy`: build through the predeploy hook, then publish `dist/` to GitHub Pages. Use only for intentional releases.

## Coding Style & Naming Conventions

Use two-space indentation, single-quoted strings, and the surrounding file’s semicolon style. Use PascalCase for component files and types, camelCase for functions and variables, and UPPER_SNAKE_CASE for constants. Keep TypeScript strict and use type-only imports where appropriate.

Use Solid signals and control-flow components such as `For` and `Show`. Keep state in `App.tsx` and processing in services. Style mobile-first with Tailwind utilities. No formatter or lint script is configured.

## Testing Guidelines

No test framework, test script, or coverage threshold is configured. Run `npm run build` for every code change. Manually verify uploads, invalid files, the 50-image and 15 MB limits, reordering, removal, all four quality modes, PDF page order, progress, themes, and mobile layouts as relevant. Include verification results in pull requests.

## Commit & Pull Request Guidelines

History mixes descriptive summaries with dependency prefixes such as `build(deps):` and `build(deps-dev):`. Write concise, action-oriented subjects and keep commits focused. Pull requests should explain the change, link relevant issues, report validation, and include screenshots for UI changes.

## Architecture & Resource Handling

Preserve client-side image processing and keep compression off the main thread. Revoke unused object URLs, terminate workers, and release transferred image resources. Avoid unnecessary dependencies and abstractions.
