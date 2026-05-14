# Stack Research

**Project:** ResumeLab
**Domain:** Local-first open-source desktop resume editor with structured profile data, LaTeX live preview, user-keyed AI tailoring, and PDF/DOCX export
**Researched:** 2026-05-14
**Confidence:** HIGH for desktop/storage/PDF preview/security boundaries; MEDIUM for DOCX fidelity because LaTeX-to-DOCX remains inherently lossy

## Recommendation

**Stack override, 2026-05-14:** The project owner rejected Rust. Use **Electron + React/TypeScript/Vite** instead of Tauri/Rust. Keep the same security model: the renderer is UI-only, while the Electron main process owns SQLite, filesystem access, sidecars, provider HTTP calls, and secret lookup through narrow IPC.

Build ResumeLab as a **Tauri 2 desktop app with a React/TypeScript/Vite frontend and a Rust backend**. Keep all trusted capabilities in Rust: SQLite access, file IO, LaTeX compilation, export, provider calls, and API-key lookup. The frontend should be a UI/editor surface, not the owner of secrets, raw SQL, or unrestricted shell access.

Use **SQLite plus SQLx** as the local source of truth, **CodeMirror 6 plus PDF.js** for the Overleaf-like editing surface, **Tectonic** as the primary LaTeX compiler sidecar, and **DOCX generation from structured resume data** rather than relying on arbitrary LaTeX-to-DOCX conversion. AI integration should be provider adapters over direct HTTPS from Rust, with user API keys stored in the OS credential store.

## Must-Have Stack Decisions

| Decision | Recommendation | Why It Matters for ResumeLab | Confidence |
|----------|----------------|------------------------------|------------|
| Desktop shell | Tauri 2.x, current stable around `2.11.x` | Gives a small local desktop package, Rust command boundary, sidecar support, and capability-scoped frontend permissions. Better match than Electron for privacy-sensitive local data. | HIGH |
| Frontend | React 19.x + TypeScript + Vite 8.x | Mature UI ecosystem for split panes, forms, editor state, PDF viewer embedding, and local desktop webview delivery. | HIGH |
| Backend | Rust stable + Tauri commands | Owns database, filesystem, subprocesses, network calls, redaction, and validation. Avoids putting provider keys in renderer code. | HIGH |
| Local database | SQLite + SQLx migrations in Rust | Structured profile facts, resume versions, templates, AI run metadata, and full-text search fit SQLite well. SQLx gives typed queries and migrations. | HIGH |
| LaTeX editor | CodeMirror 6, initially with `@codemirror/legacy-modes/mode/stex`; evaluate `codemirror-lang-latex` later | CodeMirror is modular, lighter than Monaco, and aligns with Overleaf's CodeMirror 6 direction. For v1, compile diagnostics matter more than deep LaTeX language intelligence. | MEDIUM |
| PDF preview | PDF.js / `pdfjs-dist` | Renders the compiled resume PDF inside the app without native viewer dependencies and supports custom UI around page, zoom, and diagnostics. | HIGH |
| LaTeX compile | Tectonic sidecar first; `latexmk` with TeX Live/MiKTeX as fallback | Tectonic is self-contained and sidecar-friendly. Full TeX distributions are still needed as an escape hatch for templates/packages Tectonic cannot handle. | MEDIUM |
| PDF export | The compiled LaTeX PDF artifact | PDF should be the native output of the LaTeX compile pipeline. Do not create a separate PDF renderer unless LaTeX is abandoned. | HIGH |
| DOCX export | Generate DOCX from structured profile/resume data with `docx` JS/TS or `docx-rs`; keep Pandoc as fallback only | Resume DOCX should be editable and ATS-friendly. Converting arbitrary LaTeX to DOCX can lose layout semantics, so maintain a separate simple DOCX renderer. | MEDIUM |
| AI providers | Rust `reqwest` + provider-specific adapters over REST | OpenAI, Anthropic, Gemini, and OpenRouter have different request/structured-output dialects. A thin internal provider interface is safer than exposing keys to SDKs in the renderer. | HIGH |
| Secret storage | Rust `keyring` crate for OS keychain/credential manager; optional Tauri Stronghold later | API keys must not live in SQLite, localStorage, app config, logs, prompts, or renderer state. | HIGH |

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri | 2.x, pin current stable at implementation | Desktop app shell, packaging, native bridge | Best fit for local-first privacy because Rust owns privileged operations and Tauri capabilities constrain frontend access. |
| Rust | Stable, minimum compatible with Tauri plugins (`>=1.77.2` for SQL plugin docs; use latest stable in CI) | Trusted backend, subprocess, storage, provider calls | Strong type system and easy native integration for SQLite, keyring, filesystem, and process supervision. |
| React | 19.x | UI framework | Practical default for complex editor layouts, forms, stateful AI review flows, and open-source contributor familiarity. |
| TypeScript | Latest stable | Frontend correctness | Needed for schema-bound AI outputs, editor state, and preventing fragile resume-data plumbing. |
| Vite | 8.x | Frontend build/dev server | Current Vite supports React/TS scaffolding and fast local iteration; Vite 8 requires Node 20.19+ or 22.12+. |
| SQLite | 3.x | Local profile/resume database | Durable, embedded, portable, and enough for profile data, versions, local search, and audit metadata. |
| SQLx | 0.8.x | Rust database access and migrations | Keeps SQL in backend commands and supports compile-time checked query patterns and embedded migrations. |
| CodeMirror | 6.x | LaTeX source editor | Modular browser editor with lint hooks and lighter packaging than Monaco for a focused LaTeX editor. |
| PDF.js / `pdfjs-dist` | 5.x | Live PDF preview | Standard browser PDF rendering path with custom viewer control. |
| Tectonic | 0.16.x | Primary LaTeX-to-PDF compiler | Modern self-contained TeX engine, quiet CLI, automatic reruns, PDF output, SyncTeX, and untrusted mode. |
| `docx` | 9.x | DOCX generation from structured data | Browser-compatible TS library with active examples. Useful because Tauri has no bundled Node runtime. |
| `reqwest` + `serde` | Current Rust stable crates | AI provider HTTP clients and typed JSON | Keeps secrets and provider IO in Rust while allowing provider-specific schemas. |
| `keyring` | 4.x | API key storage | Uses OS credential stores such as macOS Keychain, Windows Credential Manager, and Linux Secret Service/keyutils. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tauri-apps/api` | Match Tauri 2.x | Frontend calls to approved Tauri commands/plugins | All frontend/native interactions. Keep commands narrow and typed. |
| `tauri-plugin-dialog` | 2.x | Native open/save dialogs | Import resume, choose template, export PDF/DOCX. |
| `tauri-plugin-fs` | 2.x | Scoped file access | Only if direct frontend file access is needed; prefer Rust commands for core files. |
| `tauri-plugin-shell` | 2.x | Sidecar execution | Prefer invoking sidecars from Rust commands. If exposed to JS, lock commands and args through capabilities. |
| `@codemirror/language`, `@codemirror/legacy-modes` | 6.x | LaTeX syntax highlighting via `stex` stream mode | v1 LaTeX editing. Later evaluate richer community LaTeX grammar. |
| `@codemirror/lint` | 6.x | Compile diagnostic display | Map Tectonic/latexmk log lines to editor diagnostics. |
| `pdfjs-dist` | 5.x | PDF rendering | Split-pane preview, zoom, page nav, and rendered output verification. |
| `docx` | 9.x | DOCX export | Generate ATS-friendly DOCX from the structured resume model. |
| `mammoth` | 1.x | Optional DOCX import to semantic HTML/text | Use only for optional current-resume style/context import. It is not a layout-preserving converter. |
| `tempfile` | Current Rust crate | Isolated compile workspaces | Each compile should run in a clean temp directory with explicit copied inputs. |
| `thiserror` / `anyhow` | Current Rust crates | Backend error handling | Standardize user-visible compile/export/provider errors. |
| `tokio` | Current Rust crate | Async backend work | Compile queues, provider streaming, cancellation, and database calls. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pnpm` or `npm` | Frontend package management | Use one lockfile. Vite docs support npm/yarn/pnpm/bun/deno; pnpm is fine for repo hygiene. |
| `cargo clippy` + `cargo fmt` | Rust quality gate | Run in CI before release. |
| `eslint` + `typescript --noEmit` | Frontend quality gate | Required because editor/provider DTOs are schema-heavy. |
| Playwright | UI smoke testing | Validate app shell, editor typing, PDF preview nonblank render, export buttons. |
| `cargo-auditable` / `cargo audit` | Release security | Useful for a desktop app handling keys and local private data. |

## Desktop Framework Options

| Option | Recommendation | Use When | Tradeoffs |
|--------|----------------|----------|-----------|
| Tauri 2 | Use for v1 | You want local-first, small packaging, Rust-owned privileged operations, and sidecar support. | Requires Rust and WebView differences across Windows/macOS/Linux. Linux WebKit packaging needs CI attention. |
| Electron | Keep as fallback, not v1 default | You need a bundled Chromium/Node runtime, VS Code ecosystem reuse, or heavy Node-only libraries. | Larger app, more memory, and renderer-to-Node security hardening becomes central. |
| Flutter desktop | Do not use for v1 | You want fully native-feeling custom UI and are not relying on web editors/PDF.js. | Worse fit for CodeMirror/PDF.js and web-based editor ecosystem. |
| Qt/PySide | Do not use for v1 | You already have strong Qt expertise or need native widgets above web editing. | Slower path to a modern LaTeX editor, AI review UI, and open-source web contributor base. |
| Neutralino | Do not use for v1 | You need a very small wrapper and few native capabilities. | Too thin for secure key storage, compiler sidecars, complex exports, and typed backend boundaries. |

## Local Storage

Use **SQLite as the durable source of truth**, accessed only through Rust commands. Do not let the renderer issue raw SQL.

Recommended database responsibilities:

| Data | Storage | Notes |
|------|---------|-------|
| Profile facts | SQLite tables | Normalize experience, education, projects, skills, achievements, links, and tags. |
| Resume drafts | SQLite rows plus optional LaTeX text blobs | Store generated/tailored resume variants and edit history. |
| Templates | App data directory files plus SQLite metadata | Keep the user's initial LaTeX template as files, not just DB blobs, so compilers can consume them. |
| Generated PDFs/DOCX | App data directory or user-chosen export path | Store metadata/hash in SQLite; avoid bloating DB with repeated binaries unless needed. |
| AI provider configs | SQLite metadata only | Store provider name, model, endpoint, and nonsecret preferences. Store keys in OS keyring. |
| AI runs | SQLite audit records | Store model, timestamp, selected fact IDs, output, and whether external data was sent. Redact prompts by default unless user opts in. |

Recommended SQLite features:

| Feature | Use |
|---------|-----|
| Migrations | SQLx embedded migrations from day one. |
| FTS5 | Search profile facts, resume bullets, and job-description history locally. |
| JSON columns/functions | Store provider settings, AI metadata, and resume render parameters where relational schema would be noisy. |
| WAL mode | Better desktop concurrency and resilience. |

Avoid:

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| IndexedDB/Dexie as source of truth | Ties durable data to webview implementation and complicates backend/export access. | SQLite in Rust. |
| Flat JSON as primary store | Schema drift, migrations, search, and concurrent writes become fragile. | SQLite with migrations. |
| `tauri-plugin-sql` for core app data | It exposes SQL capability to the frontend. Useful for prototypes, but weaker as a trusted data boundary. | Rust repository/service layer using SQLx. |
| SQLCipher in v1 | Adds build and recovery complexity before product validation. | OS disk encryption plus keyring now; add SQLCipher only if threat model requires encrypted local DB. |

## LaTeX Compile And Live Preview

Recommended pipeline:

1. User edits LaTeX in CodeMirror.
2. Frontend debounces changes and calls a Rust command such as `compile_resume(document_id, source_version)`.
3. Rust writes a clean temporary project directory with the template files and source.
4. Rust runs Tectonic as a sidecar with strict args, timeout, and cancellation.
5. Rust parses logs into structured diagnostics.
6. Frontend receives compile status and renders the produced PDF with PDF.js.

Use Tectonic like this conceptually:

```bash
tectonic -X compile resume.tex --outdir <temp-output> --synctex --untrusted
```

Important product-specific constraints:

| Constraint | Recommendation |
|------------|----------------|
| Offline except explicit AI calls | Tectonic can auto-download support files. For the bundled v1 template, pre-cache or bundle required resources and compile with cached resources in normal operation. If a missing package requires network, prompt the user explicitly or fall back to installed TeX Live/MiKTeX. |
| User-edited LaTeX is executable-ish input | Always compile with Tectonic `--untrusted` or equivalent restrictions. Do not allow shell escape. |
| Live preview responsiveness | Debounce compiles, cancel stale runs, and show last successful PDF while compiling. |
| Error UX | Convert compiler log line/column into CodeMirror diagnostics and a compile panel. |
| Source-preview sync | Use SyncTeX as optional phase work, not v1 blocker. |
| Template compatibility | Keep `latexmk` plus system TeX Live/MiKTeX as an advanced fallback if Tectonic cannot compile the user's template. |

Do not use KaTeX or MathJax for resume preview. They render fragments/math, not full LaTeX documents with layout, fonts, page breaks, and class/package behavior.

## PDF And DOCX Export

### PDF

PDF export should be the latest successful LaTeX compile artifact. The export command should copy that artifact to a user-selected path, with optional "compile before export" if the source is dirty.

### DOCX

Use a separate DOCX renderer from structured resume data. Recommended path:

1. The tailored resume is represented as structured sections/bullets plus a selected template/style profile.
2. LaTeX renderer produces `resume.tex` for PDF.
3. DOCX renderer produces `resume.docx` from the same structured resume model using `docx` or `docx-rs`.
4. DOCX style should be intentionally simple: headings, bullet lists, links, margins, font choices, and no brittle absolute positioning.

Pandoc can convert LaTeX and DOCX, but it should be a fallback/import/export tool, not the core DOCX strategy. The official Pandoc format list supports LaTeX and Microsoft Word DOCX, but resume layouts depend on exact pagination, spacing, and template constructs that often do not survive arbitrary conversion cleanly.

Optional import tools:

| Tool | Use | Caveat |
|------|-----|--------|
| Mammoth | DOCX to clean HTML/text for optional current-resume style/context import | It intentionally ignores many visual details and warns conversion is not perfect for complex docs. |
| PDF.js text extraction | PDF resume text extraction | Use only as style/context input, not as canonical profile data. |
| Pandoc | DOCX/LaTeX conversion experiments | Good utility, not a fidelity guarantee. |

## AI Provider Integration

Recommended architecture: a Rust `AiProvider` trait with adapters:

```text
ResumeLab structured request
  -> provider adapter
  -> provider-specific REST payload
  -> streamed/complete provider response
  -> strict JSON validation
  -> factuality guard using stored fact IDs
```

Provider support:

| Provider | Recommended API Shape | Notes |
|----------|-----------------------|-------|
| OpenAI | Responses API with Structured Outputs when available | Good fit for typed tailoring plans and section rewrites. |
| Anthropic | Messages API; use tool schemas/tool use for structured JSON-style output | Treat tool output as model-proposed changes, then validate against stored facts. |
| Google Gemini | GenerateContent with structured output schema | Gemini docs support JSON-schema-like structured output, but it is a subset. Keep schemas simple. |
| OpenRouter-compatible | OpenAI-compatible Chat Completions endpoint | Necessary for broad model access. Do not assume it supports every OpenAI Responses feature. |

Do not put provider SDKs in the renderer for v1. Official JS SDKs are convenient, but a desktop renderer is not the right place to hold long-lived user API keys. Direct Rust HTTPS adapters are more work up front but give better custody, logging control, cancellation, and redaction.

Provider abstraction rules:

| Rule | Reason |
|------|--------|
| Provider keys never leave Rust except in HTTPS Authorization headers. | Prevent renderer inspection, XSS, localStorage leakage, and accidental logs. |
| Prompts include selected facts with stable fact IDs. | The app can prove whether output is grounded in stored truths. |
| AI output is an edit proposal, not a DB write. | Factual additions require explicit user approval. |
| Store model, provider, timestamp, token/cost metadata, and selected fact IDs. | Auditable local history without storing raw secrets. |
| Use simple JSON schemas and application validation. | Provider structured-output features differ and are not equivalent. |

Avoid LangChain/LlamaIndex for v1. They add abstraction and hidden behavior before ResumeLab needs retrieval graphs or agents. This product needs deterministic prompt construction, provider adapters, and factuality validation more than a general agent framework.

## Security And Privacy Stack Implications

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| API keys | Store via Rust `keyring` under service `ResumeLab` and account per provider. | Uses OS-backed credential storage and keeps keys out of DB/config/localStorage. |
| Optional vault | Consider Tauri Stronghold later if users need app-managed encrypted vaults, portable backup, or master-password behavior. | More UX and recovery complexity than OS keyring. |
| Renderer privileges | Minimal Tauri capabilities. No broad fs, shell, or SQL permissions. | Limits blast radius of frontend bugs. |
| Shell/sidecars | Run Tectonic/Pandoc only from Rust commands with allowlisted binary names, fixed args, temp dirs, timeouts, and cancellation. | User LaTeX and imported files are untrusted inputs. |
| Compile sandbox | Clean temp workspace, copied files only, no shell escape, no arbitrary include paths by default. | Prevents LaTeX from reading/writing unexpected local files. |
| Network | AI calls only after user action. Tectonic package downloads require explicit consent or cached-only mode. | Preserves the "offline except AI calls" promise. |
| Logs | Redact API keys, prompts, resume content, and compiler paths by default. | Resume data is highly sensitive. |
| Job links | Backend fetch only after explicit user action; manual paste remains primary fallback. | Job sites block scraping and links can trigger unwanted external requests. |

## Installation Sketch

Exact package versions should be pinned when implementation starts. Current docs support the following shape:

```bash
# Frontend
npm create vite@latest . -- --template react-ts
npm install @tauri-apps/api react react-dom
npm install codemirror @codemirror/language @codemirror/legacy-modes @codemirror/lint
npm install pdfjs-dist docx mammoth
npm install -D vite typescript eslint playwright

# Tauri
npm install -D @tauri-apps/cli@latest
npx tauri init
npx tauri add dialog
npx tauri add fs
npx tauri add shell

# Rust backend, run inside src-tauri
cargo add sqlx --features sqlite,runtime-tokio-rustls,macros,migrate,chrono,uuid,json
cargo add reqwest --features json,rustls-tls,stream
cargo add serde --features derive
cargo add serde_json thiserror anyhow tokio tempfile keyring
```

Sidecars:

```text
src-tauri/binaries/tectonic-<target-triple>
optional: src-tauri/binaries/pandoc-<target-triple>
optional fallback: user-installed latexmk/TeX Live/MiKTeX discovered at runtime
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Desktop framework | Tauri 2 | Electron | Electron is easier if Node is required, but ResumeLab benefits more from Rust-owned local trust boundaries and smaller packaging. |
| Database | SQLite + SQLx | IndexedDB/Dexie | IndexedDB is fine for a browser app, but ResumeLab needs native export, compiler, search, and backend-controlled data integrity. |
| SQL access | Rust service layer | Tauri SQL plugin from JS | Frontend SQL is fast to prototype but weaker for privacy, migrations, and command-level authorization. |
| Editor | CodeMirror 6 | Monaco | Monaco is excellent for VS Code-like IDE features, but CodeMirror is lighter and better suited to a focused LaTeX/resume editor. |
| LaTeX compiler | Tectonic sidecar | TeX Live/MiKTeX required install | Full distributions maximize compatibility but are too heavy as the first-run requirement. Keep as fallback. |
| Browser LaTeX | Native sidecar | WASM TeX | WASM TeX is improving, but native sidecar is simpler to supervise and more compatible for a desktop app today. |
| DOCX export | Structured DOCX renderer | LaTeX -> Pandoc -> DOCX only | Pandoc is useful but not enough for reliable resume DOCX fidelity. |
| AI integration | Rust provider adapters | Vercel AI SDK in renderer | Great SDK, wrong trust boundary for user-owned API keys in a desktop renderer. |
| Secret storage | OS keyring | Plain config/localStorage | Plain storage violates the privacy premise. |
| Secret vault | OS keyring now | Tauri Stronghold now | Stronghold is valid but adds password/recovery UX. Add when threat model demands it. |

## What NOT To Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `localStorage`, SQLite, or JSON config for API keys | Easy to inspect, sync, log, or leak. | Rust `keyring`; optional Stronghold later. |
| Unrestricted shell access from frontend | A compromised renderer could run arbitrary commands. | Rust commands with fixed sidecar args and capability scopes. |
| LaTeX shell escape | Turns resume source into a command execution vector. | Tectonic `--untrusted`, no shell escape, temp workspaces. |
| KaTeX/MathJax for full preview | They are not full document compilers. | Tectonic/latexmk -> PDF.js. |
| DOCX generated only by converting rendered PDF | Produces uneditable or poor Word output. | Generate DOCX from structured sections. |
| Cloud backend for v1 provider proxy | Violates local-first and requires operating user-key infrastructure. | User-configured provider keys stored locally. |
| LangChain as core | Too much framework before the product needs agents/retrieval. | Small provider adapters and strict schema validation. |
| Perfect resume import as a v1 promise | PDF/DOCX imports are lossy and style-dependent. | Treat uploads as optional style/context, not source of truth. |

## Stack Patterns By Variant

**If building the fastest personal v1:**
- Use Tauri + React + SQLite + SQLx + CodeMirror + Tectonic installed locally or bundled manually.
- Implement one LaTeX template and one DOCX renderer.
- Add OpenAI and Anthropic first, then Gemini and OpenRouter.

**If preparing open-source cross-platform releases:**
- Bundle Tectonic as a sidecar per target triple.
- Run build/test on Windows, macOS, and Linux.
- Add a compiler self-test using the bundled v1 template.
- Add startup checks for missing WebView/system dependencies.

**If the user's LaTeX template fails under Tectonic:**
- Detect and present the compile failure clearly.
- Offer TeX Live/MiKTeX plus `latexmk` fallback.
- Keep the app architecture unchanged: Rust still owns compilation and PDF.js still previews the result.

**If DOCX fidelity becomes a product differentiator:**
- Build a dedicated DOCX template/style layer from structured resume data.
- Do not chase perfect LaTeX-to-DOCX conversion.
- Consider `docx-rs` if the renderer should move fully into Rust.

**If local DB encryption becomes a requirement:**
- Add a milestone to evaluate SQLCipher/libsql encrypted storage and recovery UX.
- Keep OS keyring for provider secrets regardless.

## Version Compatibility Notes

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Vite 8.x | Node 20.19+ or 22.12+ | Prefer current Node LTS in development and CI. |
| Tauri 2.x | Rust stable + OS WebView dependencies | Windows uses WebView2; Linux requires WebKitGTK packages; macOS uses system WebKit. |
| Tauri sidecars | Target-specific binary names | Package `tectonic-<target-triple>` and call through Tauri sidecar APIs or Rust process APIs. |
| Tectonic 0.16.x | TeX/LaTeX templates | Good default, but package/network/cache behavior must be explicit for local-first privacy. |
| PDF.js 5.x | Modern webviews | Confirm Tauri webviews support required JS/browser APIs on each OS target. |
| CodeMirror 6 | Independent package versions | Pin versions together in lockfile; LaTeX language support may be legacy/community. |
| `docx` 9.x | Browser/Node | Good fit for Tauri frontend because it works in browser contexts. |
| `keyring` 4.x | Native OS stores | Verify Linux Secret Service behavior in desktop environments without a running keyring daemon. |

## Build Order Implications

1. **App shell and trust boundary first**: Tauri, React, Rust commands, minimal capabilities, app data paths.
2. **Local data model next**: SQLite migrations for profile facts, resume drafts, templates, provider metadata, AI run audit records.
3. **Editor/compile/preview loop**: CodeMirror source, Tectonic compile command, PDF.js viewer, diagnostics.
4. **Export foundation**: PDF copy/export from compiled artifact, then structured DOCX renderer.
5. **AI provider layer**: keyring, provider config UI, Rust adapters, schema validation, factuality guardrails.
6. **Optional import and polish**: DOCX/PDF style import, SyncTeX, TeX Live fallback, DB encryption.

This order reduces rewrite risk: AI generation depends on the structured profile model, export depends on the render model, and live preview depends on the compile boundary.

## Sources

| Source | What Was Verified | Confidence |
|--------|-------------------|------------|
| https://github.com/tauri-apps/tauri/releases | Current Tauri 2 release line around `2.11.x` as of 2026-05-14 | HIGH |
| https://v2.tauri.app/start/create-project/ | Tauri project creation, manual Vite setup, and CLI initialization commands | HIGH |
| https://v2.tauri.app/start/prerequisites/ | Tauri system dependencies, WebView2, Rust/Node setup expectations | HIGH |
| https://v2.tauri.app/security/capabilities/ | Tauri capability model and frontend permission scoping | HIGH |
| https://v2.tauri.app/develop/sidecar/ | External binary/sidecar packaging and scoped execution | HIGH |
| https://v2.tauri.app/reference/javascript/sql/ | Tauri SQL plugin capabilities and frontend SQL shape | HIGH |
| https://v2.tauri.app/plugin/stronghold/ | Stronghold plugin setup and secret-store permissions | HIGH |
| https://www.electronjs.org/docs/latest/tutorial/security | Electron security hardening and context isolation considerations | HIGH |
| https://vite.dev/guide/ | Vite 8 version, React/TS templates, Node compatibility | HIGH |
| https://react.dev/learn/typescript | React 19 docs and TypeScript support | HIGH |
| https://codemirror.net/docs/ and https://codemirror.net/docs/changelog/ | CodeMirror 6 architecture and current package activity | HIGH |
| https://www.overleaf.com/blog/towards-the-future-a-new-source-editor | Overleaf's CodeMirror 6 editor direction | MEDIUM |
| https://www.npmjs.com/package/%40codemirror/legacy-modes | Official legacy mode package and `stex` mode availability | MEDIUM |
| https://mozilla.github.io/pdf.js/getting_started/ | PDF.js prebuilt viewer/current stable line | HIGH |
| https://www.sqlite.org/json1.html and https://www.sqlite.org/fts5.html | SQLite JSON and FTS5 capabilities | HIGH |
| https://docs.rs/sqlx/latest/sqlx/ | SQLx version and Rust async SQL role | HIGH |
| https://tectonic-typesetting.github.io/en-US/index.html | Tectonic 0.16.9, self-contained engine, PDF output, bundle behavior | HIGH |
| https://tectonic-typesetting.github.io/book/latest/v2cli/compile.html | Tectonic compile flags, SyncTeX, output format, untrusted mode | HIGH |
| https://pandoc.org/index.html | Pandoc supported formats including LaTeX, DOCX, and PDF engines | HIGH |
| https://github.com/dolanmiu/docx | `docx` JS/TS DOCX generation, browser support, current release | MEDIUM |
| https://docs.rs/docx-rs/latest/docx_rs/ | Rust DOCX writer availability | MEDIUM |
| https://github.com/mwilliamson/mammoth.js | Mammoth DOCX import behavior and conversion caveats | MEDIUM |
| https://developers.openai.com/api/docs/guides/structured-outputs | OpenAI structured output behavior | HIGH |
| https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview | Anthropic Messages/tool-use structured call pattern | HIGH |
| https://ai.google.dev/gemini-api/docs/structured-output | Gemini structured output and JSON Schema subset | HIGH |
| https://ai.google.dev/gemini-api/docs/libraries | Google GenAI SDK status and supported languages | HIGH |
| https://openrouter.ai/docs and https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request | OpenRouter unified API and Chat Completions endpoint | HIGH |
| https://docs.rs/keyring/latest/keyring/ | Rust keyring native credential store support | HIGH |

## Gaps For Phase-Specific Research

- Verify Tectonic sidecar licensing and bundle/cache strategy for an open-source binary release.
- Test the user's actual LaTeX template under Tectonic before locking the compiler path.
- Spike DOCX output from the structured resume model and compare in Word, Google Docs, and LibreOffice.
- Confirm Linux keyring behavior across GNOME/KDE/minimal environments.
- Confirm whether Gemini/OpenRouter structured output support is sufficient for the exact resume-tailoring schemas, or whether each needs provider-specific fallback parsing.

---
*Stack research for: ResumeLab local-first desktop AI resume editor*
*Researched: 2026-05-14*
