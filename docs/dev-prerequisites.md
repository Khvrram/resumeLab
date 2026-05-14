# Development Prerequisites

ResumeLab now uses Electron for the desktop shell with a React/TypeScript/Vite renderer. No Rust toolchain is required.

## Required Tools

Install:

- Node.js 24.x or another version supported by the checked-in Vite release
- npm

Electron downloads its runtime through npm during `npm install`.

## ResumeLab Commands

```powershell
npm install
npm run dev              # Vite browser dev server
npm run desktop:dev      # Electron desktop shell + Vite renderer
npm run build            # TypeScript and Vite production build
npm run desktop:preview  # Build renderer and open it in Electron
npm test                 # Vitest suite
```

## Current Persistence

Phase 1 currently uses a repository abstraction backed by browser `localStorage` so the profile vault is runnable immediately. The next storage step is replacing that adapter with an Electron main-process persistence service backed by SQLite.

Planned local privileged work should live in Electron main/preload modules, not in the renderer:

- SQLite access
- filesystem import/export
- LaTeX compiler sidecars
- AI provider HTTP calls
- provider key storage through OS-backed credential storage

Renderer code should keep `nodeIntegration` disabled and call main-process capabilities through narrow, typed IPC.
