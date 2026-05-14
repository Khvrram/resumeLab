# Project Research Summary

**Project:** ResumeLab
**Domain:** Local-first open-source desktop resume editor with structured career data, LaTeX live preview, AI tailoring, and PDF/DOCX export
**Researched:** 2026-05-14
**Confidence:** HIGH for roadmap direction; MEDIUM for DOCX fidelity, ATS behavior, and provider-specific structured output details

## Executive Summary

ResumeLab should be built as a local-first desktop document tool, not as another cloud AI resume builder. The strongest product wedge is a private career fact database that produces truthful, job-tailored resumes with AI assistance, LaTeX control, and user-owned exports. Experts build this kind of product by separating canonical profile facts from job-specific resume drafts and rendered artifacts, then enforcing provenance so every generated claim is traceable to approved facts or explicitly marked as unsupported.

The recommended implementation is a Tauri 2 desktop app with a React/TypeScript/Vite frontend and a Rust core. Rust should own SQLite access, migrations, file IO, sidecar execution, AI provider calls, secret lookup, export, and privacy/egress policy. The frontend should own the editing and review experience: structured profile forms, LaTeX source editing, PDF preview, AI diff approval, diagnostics, and settings surfaces. Use a structured resume document model between profile facts and renderers so LaTeX/PDF, DOCX, AI validation, and structured editing all share one semantic source.

The main risks are AI factual drift, prompt injection from job descriptions and uploaded resumes, accidental privacy leaks, unsafe LaTeX compilation, data loss, DOCX export quality, and overconfident ATS claims. Mitigate these by making AI output proposals rather than mutations, requiring source fact IDs, using an explicit egress preview for provider calls, storing keys in the OS keychain, compiling LaTeX in isolated temp directories with shell escape disabled, using SQLx migrations and tested backups, proving DOCX from the resume AST early, and presenting ATS analysis as advisory checks rather than guarantees.

## Key Findings

Detailed research inputs:
- [STACK.md](STACK.md)
- [FEATURES.md](FEATURES.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PITFALLS.md](PITFALLS.md)

### Recommended Stack

Use Tauri 2 with a Rust backend as the trusted desktop core, and React/TypeScript/Vite as the frontend application surface. SQLite with SQLx should be the local source of truth. CodeMirror 6 and PDF.js should power the Overleaf-like editor and preview loop. Tectonic should be the primary LaTeX compiler sidecar, with installed TeX Live/MiKTeX plus `latexmk` as a compatibility fallback. DOCX should be generated from structured resume data, not by treating PDF/LaTeX conversion as the primary strategy.

**Core technologies:**
- Tauri 2.x - desktop shell, packaging, sidecar support, and least-privilege capabilities.
- Rust stable - trusted backend for storage, secrets, file system access, subprocesses, provider calls, and validation.
- React 19.x + TypeScript + Vite 8.x - rich editor/review UI with fast iteration; Vite 8 requires Node 20.19+ or 22.12+.
- SQLite 3.x + SQLx 0.8.x - local durable source of truth with migrations, transactions, FTS5, and JSON support.
- CodeMirror 6 - LaTeX source editor with diagnostics hooks; use `@codemirror/legacy-modes/mode/stex` initially.
- PDF.js 5.x - in-app preview of compiled PDFs with custom controls and render verification.
- Tectonic 0.16.x - primary LaTeX-to-PDF sidecar; use untrusted/sandboxed mode and explicit bundle/cache policy.
- `docx` 9.x or `docx-rs` - DOCX generation from the structured resume model; Pandoc is fallback only.
- Rust `reqwest` + `serde` - provider HTTP adapters with typed request/response validation.
- Rust `keyring` 4.x - OS-backed provider key storage; consider Stronghold or DB encryption later only if the threat model requires it.

### Expected Features

ResumeLab's v1 loop should be:

```text
Enter truthful facts -> Paste job description -> Review extracted requirements
-> Generate a tailored draft from stored facts -> Review diffs and unsupported suggestions
-> Edit structured fields or LaTeX -> Preview PDF -> Export PDF/DOCX
```

**Must have (table stakes):**
- Local structured profile database for contact info, work, projects, education, skills, certifications, awards, links, and custom facts.
- Multiple job-specific resume drafts tied to role, company, job description, revisions, and export artifacts.
- Job description paste flow with reviewable requirement extraction and keyword/alignment analysis.
- AI tailoring from stored facts only, including summary/bullet rewrites, section selection, targeted edits, and accept/reject diffs.
- Truth gate with provenance: generated claims must cite approved profile facts or become unsupported suggestions.
- Structured resume editor for section order, selected bullets, inclusion/exclusion, and draft revisions.
- Raw LaTeX editor with live PDF preview, compile status, diagnostics, and readable logs.
- PDF export, DOCX export, LaTeX/source export, and structured backup/export.
- Provider settings for OpenAI, Anthropic, Google, and OpenRouter-compatible providers, with secure key storage.
- Outbound AI context preview showing what profile/job/style context leaves the device.
- Autosave, undo/draft recovery, and re-openable job-specific history.

**Should have (competitive differentiators):**
- Truth ledger with source fact IDs and proposal history for every AI-assisted claim.
- Local-first career vault with no account or cloud sync required for v1.
- BYO multi-provider AI with provider/model metadata stored locally.
- Unified diagnostics panel combining LaTeX errors, keyword gaps, ATS/readability warnings, and truth/provenance issues.
- Application history with export artifacts and reproducible draft snapshots.
- Optional uploaded resume as style/structure context only, not as trusted canonical import.
- Transparent ATS caveats and plain-text readback instead of fake pass/fail guarantees.

**Defer (v1.x or v2+):**
- Job URL scraping beyond best-effort public fetch with paste fallback.
- Assisted PDF/DOCX/LinkedIn import into canonical facts unless every extracted field is reviewed.
- Template gallery, marketplace, Canva-style designer, and broad template customization.
- Cover letters, job tracker, browser extension, LinkedIn optimizer, interview prep, and campaign workflows.
- Cloud sync, accounts, collaboration, public share links, analytics, or mobile companion.
- Fully autonomous agentic career coach, one-click mass tailoring, or AI-authorship detector/evasion features.

### Architecture Approach

ResumeLab should be a local desktop monolith with a narrow typed IPC boundary. The frontend is an editor/review client; the Rust core is the authority for data integrity, privacy, exports, network egress, sidecars, and secrets. The most important architecture decision is to make a structured `ResumeDocument` AST the draft canonical shape, with LaTeX as a rendered projection plus possible draft-local overrides. This avoids making arbitrary LaTeX the only source of truth and keeps DOCX export, AI validation, structured editing, and provenance feasible.

**Major components:**
1. WebView frontend - profile UI, job UI, resume editor, LaTeX editor, preview, AI review, export, and settings.
2. IPC command facade - small validated commands, normalized errors, and window/capability enforcement.
3. ProfileService - approved truthful facts, sources, tags, metrics, and profile-level validation.
4. ResumeService - job-specific drafts, revisions, selected fact IDs, section ordering, manual overrides, and resume AST.
5. TemplateService - deterministic AST-to-LaTeX rendering and template contracts.
6. PreviewService - safe compile worker, diagnostics, preview cache, and compiler logs.
7. ExportService - PDF copy/export from compiled artifacts and DOCX generation from the AST.
8. AiOrchestrator - minimal context building, egress manifests, provider calls, structured proposal validation, and audit records.
9. ProviderAdapter layer - OpenAI, Anthropic, Google, and OpenRouter-specific request/response handling behind one internal port.
10. SecretStore, SidecarRunner, FileSystemGateway, and SQLite repositories - volatile integrations behind testable adapters.

**Key patterns to follow:**
- Profile truth -> draft projection: profile facts are canonical; resume drafts cite source fact IDs.
- Proposal, not mutation: AI creates pending proposal records; users apply accepted items to a new revision.
- Sidecar isolation: compilers/converters run with fixed commands, temp workspaces, timeouts, and captured logs.
- Provider adapters: provider-specific structured output quirks stay outside the domain model.
- Local egress ledger: every AI/network call has a visible local manifest before execution.

### Critical Pitfalls

1. **AI invents or mutates facts** - block direct AI writes, require `sourceFactIds`, validate proposals deterministically, and route unsupported claims to a review queue.
2. **Prompt injection and hidden egress** - treat job posts, fetched pages, uploaded resumes, and model responses as untrusted data; separate instructions from data and require user confirmation before provider calls.
3. **Secrets and private data leak into normal storage or logs** - store provider keys in OS-backed secret storage, keep keys backend-only, redact logs, and scan persisted files for fake key patterns in tests.
4. **LaTeX preview becomes local code execution** - compile in isolated temp directories, disable shell escape or use Tectonic `--untrusted`, restrict inputs/outputs, and add timeouts/cancellation.
5. **Document state and export quality drift** - do not make raw LaTeX the only source of truth; use a resume AST, stable anchors, draft revisions, early DOCX proofing, and plain-text export checks.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Guardrails and Desktop Foundation

**Rationale:** Privacy, IPC, filesystem, shell, and network boundaries are hard to retrofit. Establish the security and local-first contract before feature work depends on unsafe shortcuts.

**Delivers:** Tauri 2 shell, React/TypeScript/Vite frontend shell, Rust command facade, typed IPC, minimal capabilities, app data directories, error model, local-only default mode, and documented threat model.

**Addresses:** Privacy/provider control baseline, local-first operation, desktop app foundation.

**Avoids:** Relaxed desktop permissions, hidden network calls, renderer-owned privileged behavior, and unsafe command paths.

### Phase 2: Local Data and Source of Truth

**Rationale:** AI truth controls, drafts, exports, backup, and search all depend on stable local entities and migrations.

**Delivers:** SQLite/SQLx migrations, `ProfileFact`, `FactSource`, `JobTarget`, `ResumeDraft`, `ResumeRevision`, provider metadata, initial settings, keyring abstraction, transactions, backup/export skeleton, and service tests.

**Addresses:** Local profile database, job-specific drafts, draft recovery, provider metadata, structured data backup/export.

**Avoids:** JSON blob persistence, no migration path, WAL backup mistakes, plaintext API keys, and AI generation without stable fact IDs.

### Phase 3: Resume AST and Template Contract

**Rationale:** The product needs one semantic resume model before it can safely render LaTeX, generate DOCX, validate AI edits, or preserve manual edits.

**Delivers:** `ResumeDocument` AST, section/bullet IDs, `sourceFactIds`, support status, one licensed LaTeX template, AST-to-LaTeX renderer, stable anchors, draft revision snapshots, raw LaTeX override model, fixtures, and a thin DOCX proof.

**Addresses:** Structured resume editing foundation, one integrated LaTeX template, truth ledger foundations, future DOCX export.

**Avoids:** Raw LaTeX as the only source of truth, structured/source drift, late DOCX rewrite, and template licensing surprises.

### Phase 4: LaTeX Editor, Safe Preview, and PDF Export

**Rationale:** The Overleaf-like editing loop is a core promise and should be proven before AI polish. It also validates the sidecar security model.

**Delivers:** CodeMirror LaTeX editor, debounced compile queue, Tectonic sidecar integration, isolated build directories, timeout/cancellation, compiler diagnostics, PDF.js preview, stale/compiling/error states, and PDF export from the latest successful artifact.

**Addresses:** Raw LaTeX editor, live PDF preview, compile diagnostics, reliable PDF export.

**Avoids:** Shell escape risks, compile-on-every-keystroke jank, orphan compiler processes, stale preview confusion, and local file leakage through TeX.

### Phase 5: Job Targeting and Structured Resume Editing

**Rationale:** Job ingestion and structured editing create a useful non-AI product and give AI later phases a stable target shape.

**Delivers:** Job description paste flow, role/company metadata, requirement extraction into reviewable hard skills/soft skills/tools/responsibilities/seniority, keyword/alignment report, structured profile editor, draft editor, include/exclude controls, section ordering, autosave, undo, and initial ATS/readability checks.

**Addresses:** Job description paste, requirement extraction, missing keyword analysis, structured editor, one-page fit basics, ATS-safe formatting checks.

**Avoids:** Scraper dependency, fake ATS certainty, raw generated text without user control, and onboarding that depends on perfect resume import.

### Phase 6: AI Tailoring With One Provider

**Rationale:** AI should arrive only after profile facts, drafts, preview, and approval surfaces exist. Start with one provider to prove the schema, validation, and UX before multiplying provider quirks.

**Delivers:** Provider key setup through SecretStore, egress preview, one provider adapter, tailoring request schema, structured proposal schema, source fact validation, unsupported suggestion queue, before/after diff UI, accept/reject workflow, audit records, cancellation, token/cost estimate, and targeted edits for selected sections.

**Addresses:** AI tailored draft generation, selective AI edits, truth gate, outbound context preview, reviewable diffs, unsupported-fact suggestions.

**Avoids:** Hallucinated claims, prompt injection bypasses, hidden cost/rate-limit behavior, direct AI mutation, and leaking full profile context by default.

### Phase 7: DOCX Export and Multi-Provider Completion

**Rationale:** DOCX and provider breadth are launch expectations, but both are integration-heavy and should build on the already-proven AST and one-provider AI boundary.

**Delivers:** AST-to-DOCX renderer, controlled styles/reference document, DOCX golden fixtures, Word/LibreOffice/text-extraction QA, export artifact history, Anthropic/Google/OpenRouter adapters, provider capability registry, provider-specific error states, and recorded adapter fixtures.

**Addresses:** DOCX export, BYO multi-provider AI, application history with artifacts, provider/model transparency.

**Avoids:** Treating DOCX as a free PDF conversion, provider-neutral assumptions, regex parsing of model prose, and unsupported models for structured tasks.

### Phase 8: Import Context, Backup, and Release Hardening

**Rationale:** Once the core loop works, harden the app for open-source users and add narrow ingestion helpers that cannot corrupt the source of truth.

**Delivers:** Existing resume upload as style/structure context only, review queue for any extracted facts, portable profile/project export, restore tests, clean-machine install checks, startup dependency checks, packaging/signing workflow, license review, security regression tests, and optional public job-link fetch with paste fallback if time permits.

**Addresses:** Existing resume upload context, structured backup/export, release readiness, optional v1.x job URL ingestion.

**Avoids:** Perfect import promises, prompt injection from uploaded documents, overbuilt scraping, unlicensed templates/fonts, broken Linux keyring behavior, and packaging that only works on the developer machine.

### Phase Ordering Rationale

- Build trust boundaries first because renderer privileges, shell access, filesystem scope, and egress behavior shape every later feature.
- Build local data before AI because truthful tailoring requires stable fact IDs, approval status, revisions, and migrations.
- Build the resume AST before editor/export work because DOCX, AI validation, structured controls, and LaTeX rendering all depend on a format-neutral document model.
- Prove preview before tailoring because a generated resume that cannot compile and render quickly is not useful.
- Keep manual job paste primary because job-board scraping is brittle and not central to the v1 value proposition.
- Add one provider before multi-provider support because schema validation, egress review, and diff approval are the hard product boundaries; adapters are incremental once that boundary is correct.
- Prove DOCX before launch rather than after PDF polish because resume users notice export fidelity immediately.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Validate the actual starter LaTeX template under Tectonic, confirm license/font status, and decide the AST-to-DOCX proof strategy.
- **Phase 4:** Research Tectonic sidecar packaging, bundle/cache behavior, offline mode, and cross-platform install implications.
- **Phase 5:** Define ATS/readability checks around plain-text extraction and employer-format caveats; avoid unverifiable scoring.
- **Phase 6:** Research exact structured-output/tool-use mechanics for the first provider and create adversarial prompt-injection fixtures.
- **Phase 7:** Research DOCX library choice and provider capability matrix for Anthropic, Google, OpenRouter, and model-specific structured output support.
- **Phase 8:** Research packaging/signing, Linux keyring fallback behavior, optional DB encryption, and any job URL fetching beyond public pages.

Phases with standard patterns where phase research can usually be skipped:
- **Phase 1:** Tauri app shell, React/Vite setup, typed IPC, and least-privilege capability setup are well documented.
- **Phase 2:** SQLx migrations, SQLite transactions, service/repository tests, and profile CRUD are standard patterns.
- **Phase 5:** Manual paste flow, editable requirement lists, structured forms, and draft history are standard product workflows once the schema is defined.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based mostly on official docs for Tauri, Vite, React, SQLite, SQLx, CodeMirror, PDF.js, Tectonic, keyring, provider APIs, and Pandoc. DOCX fidelity remains MEDIUM because conversion/rendering details must be proven. |
| Features | MEDIUM | Table stakes are well supported by current resume/ATS product patterns and Overleaf-style workflows. v1 prioritization still needs user validation. |
| Architecture | HIGH | Local-first desktop boundaries, SQLite ownership, sidecar isolation, and proposal-based AI are strongly supported. Provider schema portability is MEDIUM. |
| Pitfalls | HIGH | Security, privacy, data integrity, LaTeX sandboxing, and export pitfalls are backed by official docs and common failure modes. ATS behavior is MEDIUM because vendors differ. |

**Overall confidence:** HIGH for the recommended phase order and product architecture; MEDIUM for exact DOCX fidelity, provider-specific structured output behavior, and ATS claims.

### Gaps to Address

- Actual LaTeX template compatibility: test the starter template under Tectonic early, including fonts/packages and offline/cache behavior.
- DOCX fidelity: spike AST-to-DOCX output and QA in Microsoft Word, LibreOffice, Google Docs, and text extraction before committing to a launch promise.
- Provider capability matrix: confirm structured output/tool-use support per provider and model; keep schemas simple and locally validated.
- Secret storage on Linux: verify behavior when Secret Service/keyring daemons are unavailable and define fallback UX.
- SQLite backup with WAL: implement backup through SQLite backup APIs or `VACUUM INTO`, then test restore after active writes and migrations.
- ATS validation: build plain-text readback and cautious checks; do not claim a universal ATS pass score.
- DB encryption: decide later based on threat model; do not block v1 on SQLCipher unless requirements demand encrypted local profile storage.
- User validation: confirm that the v1 wedge is fact-grounded AI tailoring plus LaTeX control, not template variety or job-tracker breadth.

## Sources

Detailed source lists are preserved in the four research files. Aggregated highlights:

### Primary (HIGH confidence)
- Tauri docs - architecture, process model, commands, capabilities, security, sidecars, and Stronghold: https://v2.tauri.app/
- Vite guide - Vite 8 and Node version compatibility: https://vite.dev/guide/
- React TypeScript docs - React/TypeScript support: https://react.dev/learn/typescript
- CodeMirror docs and changelog - CodeMirror 6 architecture and package model: https://codemirror.net/docs/
- PDF.js getting started - browser PDF rendering path: https://mozilla.github.io/pdf.js/getting_started/
- SQLite docs - FTS5, JSON, WAL, backup API, and PRAGMA behavior: https://www.sqlite.org/
- SQLx docs - Rust SQL access and migrations: https://docs.rs/sqlx/latest/sqlx/
- Tectonic docs - LaTeX-to-PDF engine, compile flags, SyncTeX, and untrusted mode: https://tectonic-typesetting.github.io/
- Pandoc manual - format conversion and DOCX reference behavior: https://pandoc.org/MANUAL.html
- OpenAI, Anthropic, Google Gemini, and OpenRouter docs - structured output/tool-use and provider API behavior.
- Rust `keyring` docs - OS-backed credential storage: https://docs.rs/keyring/latest/keyring/
- OWASP LLM Top 10 and OpenAI prompt-injection guidance - LLM security and untrusted input risks.
- TeX Live/Web2C docs - TeX file IO and shell-escape security considerations.

### Secondary (MEDIUM confidence)
- Teal, Rezi, Kickresume, Jobscan, and Resume Worded product/docs pages - current AI resume and ATS tailoring table stakes.
- Overleaf docs - expected LaTeX editor, preview, compile diagnostics, and source/PDF navigation behavior.
- Reactive Resume, JSON Resume, HackMyResume, RenderCV, and Resumx - local-first/open-source/resume-as-code ecosystem expectations.
- U.S. Department of Labor and university ATS guidance - practical ATS formatting cautions, with vendor-specific behavior still uncertain.

---
*Research completed: 2026-05-14*
*Ready for roadmap: yes*
