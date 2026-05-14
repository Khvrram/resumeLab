# V2 Foundations Scope Record

**Created:** 2026-05-14
**Status:** Foundations slice implemented
**Related requirements:** v2 requirements in `.planning/REQUIREMENTS.md`
**Current focus:** Non-destructive v2 foundations after v1 Phase 1 scaffold

## Intent

Document the safe first step toward v2 without bypassing unfinished v1 phases. This record does not replace the active roadmap. It defines what has been prepared now and what must remain deferred until the v1 data, document, job, AI, and export foundations exist.

The current app has a Phase 1 profile vault scaffold with renderer `localStorage` persistence. Future durable storage is expected to move to SQLite through Electron main-process services and narrow preload/IPC bridges.

## Non-Negotiables

- Local-first behavior remains the default.
- The structured profile remains the source of truth for factual claims.
- AI egress remains explicit and reviewable before provider calls.
- AI output remains a proposal, never a direct database write.
- Provider secrets stay out of renderer state, logs, config files, prompts, resume files, and SQLite.
- Renderer code must not receive broad Node, filesystem, SQLite, provider, model-runtime, or secret access.

## Requirement Group Mapping

| Group | Requirements | Safe foundations in first v2 pass | Deferred real implementation |
| --- | --- | --- | --- |
| Templates | TMPL-01, TMPL-02, TMPL-03 | Define template registry shape, template capability metadata, section mapping contract, customization token vocabulary, and migration path from the v1 single LaTeX template. | Full gallery UX, third-party template import flow, arbitrary template validation, live template customization, marketplace-like behavior. |
| Job Search | JOBS-01, JOBS-02, JOBS-03, JOBS-04 | Define local application tracking model, status vocabulary, relationship to job targets and resume drafts, cover-letter record shape, and manual-paste-first ingestion path. | Browser extension, broad job-board scraping, provider-specific job-board fetch fallbacks, complete cover-letter generation workflow. |
| AI and Providers | LOCL-01, AIEX-01, AIEX-02 | Extend provider/run contracts conceptually for capabilities, local-provider adapter slots, comparison groups, prompt profile records, egress snapshots, errors, and provenance. | Actual local LLM inference, model downloads, local runtime management, multi-provider comparison UI, custom prompt editor, reusable prompt execution. |
| Collaboration and Sync | SYNC-01, SYNC-02, SYNC-03 | Preserve stable IDs, revision IDs, timestamps, exportable local bundles, and future conflict metadata in data design. Define sync as opt-in and encrypted by design. | Cloud sync, encrypted remote storage, collaboration sessions, reviewer comments, shared public/read-only preview links. |
| Advanced Editing | ADV-01, ADV-02, ADV-03 | Define source-anchor concepts between structured nodes, generated LaTeX ranges, compile revisions, and preview page hints. Keep import facts as review-only candidates. | SyncTeX-style PDF/source navigation, deep grammar/tone/impact scoring, high-confidence resume fact extraction and import automation. |

## Integration Path

1. Finish v1 Phase 1 enough to provide stable profile fact IDs, visibility flags, and a clear migration path from renderer `localStorage` to Electron main-process SQLite.
2. In Phase 2, make resume drafts structured first, with LaTeX generated from mapped sections and revision IDs that v2 template, anchor, and collaboration records can reference.
3. In Phase 3, add job targets and alignment records before v2 application tracking or job search surfaces depend on them.
4. In Phase 4, implement provider configuration, egress preview, AI run metadata, proposal diffs, and provenance before v2 provider comparison, prompt profiles, or local-provider slots become active.
5. In Phase 5, complete export, backup/restore, import-context boundaries, and offline checks before v2 sync/collaboration or public sharing is reconsidered.

## Explicit Non-Implementation Statements

The first v2 pass does not implement:

- Cloud sync.
- Browser extension capture.
- Actual local LLM inference.
- SyncTeX.

It also does not implement public sharing, collaboration, full job-board scraping, complete template gallery behavior, deep scoring, or automated fact import from resumes.

## Acceptance Checks

- This record maps every v2 requirement group from `.planning/REQUIREMENTS.md` to safe foundations and deferred implementation.
- `docs/v2-foundations.md` provides the concise product and engineering integration plan.
- `src/domain/v2.ts`, `src/storage/v2Repository.ts`, and `src/components/V2Workspace.tsx` add an isolated local-only v2 foundation surface without changing v1 profile-vault behavior.
- Existing roadmap, requirements, state, and package files are unchanged.
- The scope preserves Electron security boundaries: privileged work belongs in main/preload services, not renderer direct access.
- The scope preserves fact governance: unsupported claims cannot enter drafts or profile data without explicit user approval.
- The scope names v1 phase dependencies so future v2 work does not race ahead of required local data, document, job, AI, and export foundations.
