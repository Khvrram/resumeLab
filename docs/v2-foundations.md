# v2 Local Workflows

This document scopes the current v2 local workflow pass for ResumeLab. The app now includes usable local records and actions for template setup, job tracking, prompt previews, and local model endpoint checks while preserving the v1 local-first resume workflow.

## Product Scope

ResumeLab v2 expands the product beyond a single local resume tailoring loop into a broader job-search workspace. The eventual v2 direction includes template choice, application tracking, cover letters, richer provider workflows, optional sync/collaboration, and advanced editing assistance.

The current v2 pass builds pieces that can coexist with v1:

- Create, duplicate, remove, and edit template records with LaTeX mapping placeholders.
- Create and edit local job application records, paste job descriptions, and extract local requirements, keywords, tools, responsibilities, and seniority signals.
- Create, duplicate, remove, and edit prompt profiles with rendered prompt previews.
- Register local model endpoints and check their model-list endpoint readiness.
- Preserve stable IDs, revision records, and provenance needed for future sync, review, and collaboration.
- Add editing anchors that can later support source-to-preview navigation without requiring SyncTeX in this pass.

The pass should not make v2 features appear complete before their dependencies exist. Any visible v2 UI should read as local, staged, and explicit about unavailable capabilities.

## Deferred

These are not implemented in the first v2 pass:

- Cloud sync, encrypted cloud storage, collaboration, reviewer workflows, and public read-only preview links.
- Browser extension capture for job posts.
- Real job-board scraping/fetching beyond the v1 manual paste and later provider-specific fallback plan.
- Actual local LLM inference, model downloads, GPU/CPU runtime management, or bundled local model execution.
- SyncTeX or true PDF-to-LaTeX bidirectional navigation.
- Template marketplace behavior or arbitrary third-party template execution.
- Deep grammar, tone, impact scoring, or high-confidence fact import from resumes.

## Dependencies on v1

v2 foundations must land in the order allowed by unfinished v1 work:

| v1 dependency | Required before v2 can use it |
| --- | --- |
| Phase 1 - Local Profile Vault | Stable profile fact IDs, visibility settings, local persistence boundary, and future SQLite migration path. |
| Phase 2 - Resume Template and Editing Loop | Structured resume draft model, LaTeX template mapping, preview pipeline, revision history, and source anchors. |
| Phase 3 - Job Targeting and Alignment | Job target records, pasted descriptions, extracted requirements, and non-AI alignment data. |
| Phase 4 - AI Tailoring and Fact Governance | Provider configuration, egress preview, AI run metadata, proposal diffs, provenance, and unsupported-claim gates. |
| Phase 5 - Export, Import, and Offline Release | PDF/DOCX/LaTeX export paths, backup/restore, offline checks, and import-as-context boundaries. |

Until those phases are complete, v2 work should prefer data contracts, adapters, migrations, and empty states over end-user promises.

## Engineering Path

### 1. Keep v1 canonical

The structured profile remains the source of truth. v2 records should reference profile facts, resume drafts, job targets, provider runs, and export artifacts by stable IDs instead of copying mutable factual claims. If a v2 feature needs a fact that is not in the profile, it must use the same explicit user approval rules as v1.

### 2. Move privileged work through Electron main/preload

Renderer code should not gain direct filesystem, SQLite, provider, model-runtime, or secret access. Future v2 capabilities should use typed IPC bridges through preload and Electron main-process services:

- SQLite repositories and migrations.
- Template import validation and local file access.
- Provider HTTP adapters and local-provider process adapters.
- OS keyring access for provider secrets.
- Export, backup, and restore file operations.

`nodeIntegration` should remain disabled.

### 3. Add local data foundations first

The safest v2 start is local schema and repository planning:

- Template registry records: template ID, display name, capabilities, supported sections, mapping status, and customization tokens.
- Job application records: job target ID, company, role, status, notes, related resume draft IDs, related cover letter IDs, and timestamps.
- Provider run records: provider family, model, prompt profile ID, input snapshot references, output proposal references, timing, error state, and comparison grouping.
- Collaboration/sync readiness fields: stable IDs, updated timestamps, revision IDs, and conflict metadata, without network sync.
- Editing anchor records: structured node ID, generated LaTeX range, preview page hints, and compile revision ID, without SyncTeX behavior.

### 4. Gate real implementation behind dependencies

Each v2 group should start with contracts and local-only data paths, then become user-facing only after its v1 dependency is usable:

- Template gallery depends on Phase 2 template mapping and preview.
- Application tracking depends on Phase 3 job targets.
- Cover letters depend on Phase 4 AI proposals and Phase 5 export conventions.
- Provider comparison depends on Phase 4 AI run metadata.
- Sync/collaboration depends on durable local persistence, revisions, backup/restore, and a later security design.
- Advanced source navigation depends on Phase 2 compile output and preview anchors.

## Acceptance Checks for This Pass

- `docs/v2-foundations.md` explains current foundations, deferrals, v1 dependencies, and integration path.
- `.planning/V2-FOUNDATIONS.md` maps each v2 requirement group to safe foundations and deferred implementation.
- `src/domain/v2.ts` defines the first local-only data contracts for template metadata, application tracking, prompt profiles, local model endpoints, advanced editing flags, and future sync settings.
- `src/storage/v2Repository.ts` persists those contracts in an isolated renderer storage key until the v1 SQLite boundary is ready.
- `src/components/V2Workspace.tsx` exposes editable V2 workflows for templates, jobs, prompts, and local model endpoints.
- The documents explicitly state that cloud sync, browser extension capture, actual local LLM inference, and SyncTeX are not part of the first v2 pass.
- The plan preserves local-first behavior, explicit AI egress review, user-owned secrets, and fact governance.
