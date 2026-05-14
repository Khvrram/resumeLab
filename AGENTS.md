# ResumeLab Agent Guide

## Project Context

ResumeLab is a local-first, open-source desktop resume editor. The app stores truthful career data in a structured local profile database, generates job-specific resume drafts from that data, supports structured editing plus raw LaTeX editing with live preview, and exports PDF/DOCX artifacts.

Core value: generate accurate, ATS-friendly, job-tailored resumes from truthful local profile data while keeping the user in control of every factual claim.

## Current Planning State

- Project context: `.planning/PROJECT.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Roadmap: `.planning/ROADMAP.md`
- State: `.planning/STATE.md`
- Research: `.planning/research/`
- Generated GSD guide: `CLAUDE.md`

Current focus: Phase 1 - Local Profile Vault.

## Stack Direction

The active stack override is Electron, because the project owner rejected Rust/Tauri after the initial research pass.

- Desktop shell: Electron
- Frontend: React, TypeScript, Vite
- Backend: Electron main process with narrow preload/IPC bridges
- Local data: SQLite from Node in the main process
- LaTeX editor: CodeMirror 6
- PDF preview: PDF.js
- LaTeX compile: Tectonic sidecar first, TeX Live/MiKTeX fallback later
- DOCX export: generate from structured resume data, not arbitrary LaTeX conversion
- Provider calls: Electron main-process HTTP adapters for OpenAI, Anthropic, Google, and OpenRouter-compatible APIs
- Secrets: OS keyring; do not store provider keys in frontend state, logs, config files, or SQLite

Security rule: keep `nodeIntegration` disabled in the renderer. Filesystem, SQLite, sidecars, provider calls, and secrets belong in Electron main/preload capabilities with narrow typed IPC.

## Non-Negotiable Product Rules

- Local-first: core profile, resume editing, preview, and export workflows must work offline.
- AI egress must be explicit: users see and approve what context is sent before provider calls.
- AI output is a proposal, not a direct database write.
- Unsupported factual claims must not enter a resume unless the user explicitly approves them as a user-authored override.
- The structured profile is the source of truth; job-specific drafts are derived artifacts.
- Uploaded resumes are optional style/context input for v1, not authoritative fact import.

## Workflow

Use GSD planning artifacts as the source of truth before implementation:

- `$gsd-discuss-phase 1` to gather implementation context for Phase 1.
- `$gsd-ui-phase 1` before frontend-heavy Phase 1 UI work.
- `$gsd-plan-phase 1` to generate executable plans.

Do not bypass `.planning/` unless the user explicitly asks for an ad-hoc change outside the GSD workflow.
