# Architecture Research

**Domain:** Local-first desktop resume editor with structured profile data, LaTeX editing, AI tailoring, and PDF/DOCX export
**Project:** ResumeLab
**Researched:** 2026-05-14
**Confidence:** HIGH for desktop/local data/export boundaries; MEDIUM for multi-provider AI schema portability

## Standard Architecture

ResumeLab should be a local-first desktop monolith with a deliberately small webview surface and a Rust core that owns durable data, secrets, file system access, subprocess execution, export, and network egress. The frontend should render the product experience and hold short-lived UI state only. The profile database is the durable source of truth; job-specific resumes are derived artifacts that may contain draft-local wording and manual LaTeX overrides.

The key architectural decision is to introduce a resume document model between profile facts and renderers. Do not make raw LaTeX the only canonical resume state. LaTeX is excellent for the PDF path, but DOCX export, structured editing, AI validation, and fact provenance all need a structured intermediate representation.

### System Overview

```text
+-----------------------------------------------------------------------+
| WebView Frontend                                                       |
| React/Svelte/etc UI, editor panes, preview pane, diff/approval screens |
|                                                                       |
|  Profile UI  Resume UI  LaTeX Editor  Preview UI  AI Review  Export UI |
+------------------------------- typed IPC -----------------------------+
                                |
+-------------------------------v---------------------------------------+
| Tauri Rust Core                                                        |
|                                                                       |
|  Commands/API facade                                                   |
|    -> validates inputs, enforces window permissions, normalizes errors |
|                                                                       |
|  Domain services                                                       |
|    -> ProfileService        owns approved truthful facts                |
|    -> ResumeService         owns draft lifecycle and resume AST         |
|    -> TemplateService       renders AST to LaTeX/template slots         |
|    -> PreviewService        compiles LaTeX and streams diagnostics      |
|    -> ExportService         writes PDF/DOCX artifacts                   |
|    -> AiOrchestrator        builds AI payloads and stores proposals     |
|    -> JobIngestionService   handles paste-first job targets             |
|                                                                       |
|  Integration adapters                                                  |
|    -> ProviderAdapter       OpenAI/Anthropic/Google/OpenRouter          |
|    -> SecretStore           OS keychain or Stronghold                   |
|    -> SidecarRunner         Tectonic/Pandoc with fixed arguments        |
|    -> FileSystemGateway     scoped imports/exports                     |
+------------------------------- data ----------------------------------+
                                |
+-------------------------------v---------------------------------------+
| Local Storage                                                          |
|                                                                       |
|  SQLite app DB                                                         |
|    profile_facts, fact_sources, job_targets, resume_drafts,             |
|    draft_revisions, ai_proposals, exports, settings_metadata            |
|                                                                       |
|  Secret store                                                          |
|    provider API keys, optional DB encryption material                   |
|                                                                       |
|  App data files                                                        |
|    templates, uploaded style resume, compile cache, export artifacts    |
+-----------------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| WebView frontend | Presents editors, preview, review diffs, settings, and export controls. Holds only ephemeral UI state. | Must not directly own secrets, unrestricted file access, subprocess execution, or durable fact mutation rules. |
| IPC command facade | The only public API between frontend and core. Validates DTOs, maps errors, authorizes command scope. | No business logic in UI callbacks; no direct plugin DB access from arbitrary components. |
| ProfileService | Owns approved education, experience, projects, skills, metrics, and evidence/provenance. | Only explicit user actions can create or change approved facts. AI can create suggestions, not facts. |
| ResumeService | Owns job-specific resume drafts, revisions, selected facts, section ordering, manual overrides, and the resume AST. | Drafts may diverge from profile truth but every factual claim must reference approved facts or be flagged unsupported. |
| TemplateService | Maps resume AST to the user's LaTeX template and later to additional templates. | Template rendering is deterministic. It should not call AI or mutate profile facts. |
| PreviewService | Compiles current LaTeX to preview PDF, captures logs, maps diagnostics back to editor locations where possible. | Runs compiler through a controlled sidecar/subprocess boundary with fixed arguments and temp directories. |
| ExportService | Produces PDF and DOCX artifacts, records export metadata, writes only to user-approved paths. | PDF can use LaTeX. DOCX should be generated from the resume AST where possible; arbitrary LaTeX-to-DOCX conversion is a fallback with warnings. |
| AiOrchestrator | Builds minimal AI context, previews egress payloads, calls provider adapters, validates structured proposals, stores pending proposals. | AI responses are untrusted input. They cannot directly update profile facts or committed resume drafts. |
| ProviderAdapter | Normalizes OpenAI, Anthropic, Google, and OpenRouter-style calls behind one internal interface. | Provider-specific schema/tool support stays here; core domain code should not depend on one provider's response shape. |
| SecretStore | Stores provider keys and encryption material using OS-native secure storage or Tauri Stronghold. | Secrets are retrieved in the Rust core only and never sent to the frontend or logs. |
| JobIngestionService | Stores pasted job descriptions and optional fetched job pages. Extracts role requirements for tailoring. | Manual paste is the primary path. Link fetching is best-effort and must be explicit network egress. |

## Core Domain Model

### Durable Entities

| Entity | Purpose | Notes |
|--------|---------|-------|
| `ProfileFact` | Canonical truthful data about the user. | Stable IDs are mandatory. Include type, text, dates, tags, metrics, source, and user approval status. |
| `FactSource` | Provenance for a fact. | Manual entry, imported resume, user note, or approved AI suggestion. |
| `JobTarget` | A pasted description or fetched job page. | Store raw text, normalized requirements, company/role metadata, and source URL if present. |
| `ResumeDraft` | Job-specific output derived from profile facts. | Stores selected fact IDs, section order, tailored wording, template ID, and current revision. |
| `ResumeRevision` | Versioned draft snapshot. | Enables undo, comparison, and recovery from bad AI or raw LaTeX edits. |
| `TailoringProposal` | AI-proposed patch awaiting approval. | Stores model/provider, payload summary, proposed changes, unsupported claims, token/cost metadata. |
| `ExportArtifact` | PDF/DOCX output record. | Store path, format, timestamp, draft revision, compiler/converter logs, checksum if useful. |
| `ProviderCredentialMetadata` | Non-secret provider settings. | Key names, provider enabled state, default model, rate/cost preferences. Actual keys live in SecretStore. |

### Resume AST

Use a structured resume AST as the draft canonical shape:

```typescript
type ResumeDocument = {
  id: string;
  jobTargetId?: string;
  templateId: string;
  sections: ResumeSection[];
  styleProfileId?: string;
  latexOverride?: {
    source: string;
    syncedFromRevisionId: string;
    status: "clean" | "manual_override" | "compile_error";
  };
};

type ResumeBullet = {
  id: string;
  text: string;
  sourceFactIds: string[];
  tailoringIntent?: "match_keyword" | "emphasize_metric" | "compress" | "style_match";
  supportStatus: "supported" | "needs_review" | "unsupported";
};
```

This gives three important guarantees:

1. Structured profile editing can regenerate resumes without parsing arbitrary LaTeX.
2. AI output can be validated as changes to known sections/bullets with required `sourceFactIds`.
3. PDF and DOCX export can share the same logical document instead of treating DOCX as a lossy afterthought.

## Recommended Project Structure

```text
src/
  app/                         # App shell, routing, global UI providers
  features/
    profile/                   # Profile fact editor and selectors
    jobs/                      # Job paste/link UI and requirement views
    resumes/                   # Draft list, structured resume editor
    latex/                     # LaTeX editor integration and diagnostics UI
    preview/                   # PDF preview surface
    ai-review/                 # Egress preview, proposal diff, approval UI
    export/                    # Export dialogs and artifact history
    settings/                  # Provider metadata and privacy controls
  lib/
    ipc/                       # Typed frontend command clients
    state/                     # UI-only state stores
    validators/                # Client-side form validation only
    components/                # Shared UI primitives

src-tauri/
  capabilities/                # Least-privilege Tauri capability files
  binaries/                    # Optional sidecars: tectonic, pandoc, etc.
  migrations/                  # SQLite migrations
  src/
    commands/                  # Thin IPC command handlers by feature
      profile.rs
      resumes.rs
      jobs.rs
      ai.rs
      preview.rs
      export.rs
      settings.rs
    domain/                    # Pure domain types and invariants
      facts.rs
      resume_ast.rs
      proposals.rs
      validation.rs
    services/                  # Application services
      profile_service.rs
      resume_service.rs
      template_service.rs
      ai_orchestrator.rs
      preview_service.rs
      export_service.rs
      job_ingestion_service.rs
    adapters/                  # Replaceable external integrations
      db.rs
      secret_store.rs
      provider_openai.rs
      provider_anthropic.rs
      provider_google.rs
      provider_openrouter.rs
      sidecar_runner.rs
      filesystem.rs
    templates/                 # Built-in template renderer and fixtures
    security/                  # Egress policy, redaction, audit helpers
    errors.rs                  # Serializable command errors
    lib.rs
```

### Structure Rationale

- **Frontend `features/`:** Keeps user workflows visible and avoids a generic component soup. The frontend is allowed to be rich, but it should stay a client of the core.
- **Core `commands/`:** Commands are transport adapters. They should be thin enough that service tests can bypass Tauri.
- **Core `domain/`:** Fact support, proposal validity, and resume AST rules should be testable without a database, webview, compiler, or provider account.
- **Core `services/`:** Coordinates storage and domain logic. This is where roadmap phases should add behavior.
- **Core `adapters/`:** Contains volatile dependencies: providers, sidecars, file system, credential storage, database driver.
- **`capabilities/`:** Treat permissions as source code. Review changes to file system, shell, HTTP, and secret access like security-sensitive changes.

## Architectural Patterns

### Pattern 1: Profile Truth -> Draft Projection

**What:** Profile facts are canonical. Resume drafts are projections that carry provenance links back to facts.

**When to use:** Every generated or edited resume bullet should know which approved fact(s) support it.

**Trade-offs:** Requires more schema work up front, but it prevents the central product failure mode: plausible unsupported resume claims.

```typescript
type TailoredBulletPatch = {
  bulletId?: string;
  operation: "add" | "replace" | "remove" | "reorder";
  proposedText: string;
  sourceFactIds: string[];
  rationale: string;
};
```

### Pattern 2: Proposal, Not Mutation

**What:** AI calls produce `TailoringProposal` records. A separate user action applies approved proposal items to a `ResumeRevision`.

**When to use:** All AI rewriting, targeted edits, section highlighting, and missing-fact suggestions.

**Trade-offs:** Adds review UI work, but makes control and auditability concrete rather than relying on prompt wording.

```text
AI response -> parse -> schema validate -> fact-reference validate
            -> unsupported-claim report -> user diff approval
            -> apply approved patch -> new resume revision
```

### Pattern 3: Sidecar Isolation for Compilers and Converters

**What:** Run Tectonic/Pandoc or other CLI tools through one `SidecarRunner` with fixed executable names, bounded temp directories, explicit output paths, timeouts, and captured logs.

**When to use:** PDF preview, PDF export, DOCX conversion fallback, template validation.

**Trade-offs:** Sidecars add packaging complexity. The alternative, unrestricted shell execution, is unacceptable for a desktop app handling private career data.

### Pattern 4: Provider Adapters Behind One AI Port

**What:** The app core calls a provider-neutral interface such as:

```typescript
interface AiProvider {
  generateTailoringProposal(request: TailoringRequest): Promise<TailoringProposalJson>;
}
```

Each adapter translates to provider-specific structured-output or tool-use mechanics.

**When to use:** OpenAI, Anthropic, Google, OpenRouter-compatible providers, and future local models.

**Trade-offs:** Lowest-common-denominator schemas must stay simple. Provider-specific extras belong in adapter configuration, not the domain model.

### Pattern 5: Local Egress Ledger

**What:** Before every AI/network call, show and store a local summary of what leaves the device: provider, endpoint, model, selected facts, job text length, included style context, and estimated cost if available.

**When to use:** AI tailoring, job URL fetching, optional update checks, crash reports if ever added.

**Trade-offs:** Slight friction, but it turns "local-first except explicit AI calls" into enforceable product behavior.

## Data Flow

### Profile Truth to Tailored Resume to Export

```text
1. User creates/edits truthful profile facts
   Frontend Profile UI
     -> profile.save_fact IPC
     -> ProfileService validates
     -> SQLite profile_facts + fact_sources

2. User creates job target
   Frontend Job UI
     -> jobs.create_from_paste IPC
     -> JobIngestionService normalizes text
     -> SQLite job_targets

3. User starts a draft
   Frontend Resume UI
     -> resumes.create_draft(jobTargetId, selectedFactIds)
     -> ResumeService builds ResumeDocument AST
     -> TemplateService renders LaTeX projection
     -> SQLite resume_drafts + resume_revisions

4. User optionally requests AI tailoring
   Frontend AI Review UI
     -> ai.prepare_payload(draftId, jobTargetId, selectedSections)
     -> AiOrchestrator builds minimal context from approved facts only
     -> Frontend displays egress preview
     -> user approves provider call
     -> ProviderAdapter sends request using SecretStore key
     -> structured proposal returned
     -> validators mark unsupported or missing-source claims
     -> SQLite ai_proposals

5. User approves proposal items
   Frontend diff UI
     -> ai.apply_proposal_items(proposalId, itemIds)
     -> ResumeService applies patch to ResumeDocument AST
     -> new ResumeRevision
     -> TemplateService refreshes LaTeX projection

6. User edits structured fields or raw LaTeX
   Structured edit:
     -> resumes.update_ast
     -> render LaTeX
     -> preview

   Raw LaTeX edit:
     -> resumes.update_latex_override
     -> compile directly for preview
     -> mark draft as manual_override if AST and LaTeX diverge

7. User exports
   PDF:
     ResumeRevision LaTeX -> Preview/ExportService -> Tectonic sidecar -> PDF

   DOCX:
     ResumeDocument AST -> DOCX writer preferred
     ResumeDocument/LaTeX -> Pandoc fallback only with conversion warnings
```

### AI Boundary and Approval Workflow

```text
Approved local facts + job target + optional style context
       |
       v
ContextBuilder selects minimal facts and source IDs
       |
       v
Egress preview shown to user
       |
       v
User confirms provider/model/network call
       |
       v
ProviderAdapter sends structured-output request
       |
       v
Untrusted model response
       |
       v
Schema validation + sourceFactId validation + unsupported-claim checks
       |
       v
TailoringProposal stored as pending
       |
       v
User accepts/rejects individual changes
       |
       v
ResumeRevision created from accepted changes only
```

Rules:

- AI may rephrase, reorder, compress, emphasize, and map facts to job requirements.
- AI may suggest missing factual additions, but those suggestions enter a `pending_fact_suggestions` or `ai_proposals` table, not `profile_facts`.
- A proposal item that adds a factual claim without `sourceFactIds` is blocked from one-click apply.
- A proposal item that references nonexistent, deleted, or unapproved fact IDs is invalid.
- Provider responses, prompts, and logs are local records unless the user opts to delete them. Do not log API keys or full secrets.
- The approval UI should show both the text diff and the supporting fact references. Without this, "AI cannot invent facts" is not actually enforceable.

### Local Privacy and Security Boundary

```text
Untrusted/less-trusted:
  WebView JS, rendered HTML, pasted job descriptions, uploaded resumes,
  model responses, fetched job pages

Trusted core:
  Rust command handlers, domain validators, DB connection, secret access,
  sidecar launcher, file system gateway

External:
  AI provider APIs, job posting URLs, optional update endpoints
```

Required controls:

1. **No direct secret exposure:** Provider keys stay in SecretStore. The frontend can ask whether a provider is configured, but cannot read the key.
2. **No hidden network calls:** AI and link fetching require explicit user action. Settings should make provider egress obvious.
3. **Least-privilege Tauri capabilities:** Grant only needed filesystem, shell, HTTP, and stronghold/keychain permissions to the main window. Avoid remote web content having Tauri API access.
4. **Scoped file access:** Imports and exports go through native dialogs and core file gateways. Do not allow arbitrary path reads from the webview.
5. **Controlled sidecars:** Only configured compilers/converters can run. Arguments should be allowlisted and generated by the core.
6. **Local database discipline:** SQLite is appropriate for a single-user desktop app. Use migrations, transactions, and safe backup/export commands. If WAL mode is used, backup the database through SQLite backup APIs or include WAL state correctly.
7. **Encryption decision:** API keys need secure storage from the first provider phase. Full profile DB encryption is a separate product/security decision; design storage behind an adapter so SQLCipher or another encrypted store can be added without changing domain services.
8. **Redaction:** Error reports, build logs, and AI request summaries should avoid full profile dumps unless the user explicitly opens or exports them.

## Build Order and Dependencies

The lowest-risk build order is to prove the local document pipeline before adding AI. AI depends on stable facts, draft provenance, preview, export, and approval UI; building it earlier would hide core product risk behind generated text.

| Order | Phase | Builds | Depends On | Risk Reduced |
|-------|-------|--------|------------|--------------|
| 1 | Desktop foundation and trust boundaries | Tauri shell, frontend shell, typed IPC, capabilities, app data directories, error model, settings metadata | None | Prevents later rewrites around process/security boundaries. |
| 2 | Local data foundation | SQLite migrations, `ProfileFact`, `JobTarget`, `ResumeDraft`, `ResumeRevision`, repository/services tests | Phase 1 | Establishes source-of-truth model before UI and AI depend on it. |
| 3 | Resume AST and LaTeX template renderer | One existing LaTeX template, AST-to-LaTeX renderer, fixture resumes | Phase 2 | Separates structured resume semantics from template syntax. |
| 4 | Live preview pipeline | LaTeX editor pane, compile command, Tectonic sidecar or installed engine integration, diagnostics, preview cache | Phase 3 | Proves the Overleaf-like loop before tailoring. |
| 5 | Structured profile and draft editing | Profile CRUD, selected facts, structured resume editor, draft revisions, raw LaTeX override handling | Phases 2-4 | Gives a useful non-AI app and tests truth-to-document flow. |
| 6 | Export pipeline | PDF export, DOCX export from AST, Pandoc fallback evaluation, export history | Phases 3-5 | Surfaces DOCX fidelity issues before AI produces many drafts. |
| 7 | AI provider and approval boundary | SecretStore, provider metadata, one provider adapter first, egress preview, structured proposal schema, validation, diff approval | Phases 2-6 | Contains hallucination, privacy, and provider variability risks. |
| 8 | Multi-provider expansion | Anthropic/Google/OpenRouter adapters, provider capability matrix, retries, cost/token summaries | Phase 7 | Keeps provider-specific quirks behind adapters. |
| 9 | Job link ingestion and style upload | Best-effort URL fetch, manual fallback, current resume upload as style context, section-targeted AI edits | Phases 5-8 | Defers brittle scraping and style extraction until the core loop works. |
| 10 | Hardening and open-source readiness | Backup/restore, optional DB encryption, packaging/signing, import/export of profile data, test fixtures, docs | All prior | Makes the app safe to distribute beyond the owner. |

### Phase Ordering Rationale

- **Data model before AI:** The app cannot enforce truthful tailoring until facts have stable IDs and approval status.
- **Resume AST before exports:** DOCX and AI validation both need a format-neutral document model.
- **Preview before tailoring:** The main editing promise is Overleaf-like feedback. A generated resume that cannot be previewed quickly is not useful.
- **PDF before DOCX fidelity work:** PDF is the natural LaTeX path. DOCX should be built from the AST to reduce conversion loss.
- **Manual paste before scraping:** Job site scraping is unreliable and should not block the core workflow.
- **One provider before many:** Prove prompt schema, egress preview, validation, and approval with one adapter, then generalize.

## Anti-Patterns

### Anti-Pattern 1: AI Writes Directly to the Profile

**What people do:** Let the model update the user's master profile or add bullets automatically.

**Why it is wrong:** It breaks the product's central trust promise. Once unsupported claims enter the canonical profile, future resumes can repeat them.

**Do this instead:** AI creates proposals. User-approved factual additions go through the same fact creation path as manual facts, with provenance.

### Anti-Pattern 2: Raw LaTeX as the Only Source of Truth

**What people do:** Store one `.tex` blob and try to parse it back into structured data.

**Why it is wrong:** LaTeX is too flexible for reliable reverse parsing, and it makes DOCX, AI validation, and structured controls fragile.

**Do this instead:** Store a resume AST and render LaTeX from it. Raw LaTeX edits are draft-local overrides with clear sync status.

### Anti-Pattern 3: Direct Database Access from the Frontend

**What people do:** Use a frontend SQL plugin broadly because it is convenient.

**Why it is wrong:** It spreads persistence rules and fact integrity checks into UI code and increases the blast radius of frontend compromise.

**Do this instead:** Keep DB access in the Rust core. Expose small, validated commands.

### Anti-Pattern 4: Arbitrary Shell Execution for Preview

**What people do:** Let the frontend assemble shell commands for LaTeX/Pandoc.

**Why it is wrong:** A pasted job description, uploaded resume, or malicious template could influence command execution.

**Do this instead:** Use a sidecar runner with fixed commands, allowlisted arguments, temp directories, and timeouts.

### Anti-Pattern 5: Treating DOCX as "Just Convert the PDF/LaTeX"

**What people do:** Build PDF first, then rely on generic conversion for DOCX.

**Why it is wrong:** Pandoc itself warns conversions can be lossy when formats are more expressive than its document model. Resume formatting is exactly where users notice small layout errors.

**Do this instead:** Generate DOCX from the structured resume AST where possible. Use Pandoc only as a fallback or for simple templates.

### Anti-Pattern 6: Provider-Neutral AI Without Provider Capability Checks

**What people do:** Assume every model/provider supports the same JSON Schema or tool behavior.

**Why it is wrong:** Structured-output support differs across providers and models.

**Do this instead:** Maintain provider capability metadata and keep the proposal schema simple. Validate every response locally regardless of provider claims.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI API | ProviderAdapter with structured output schema where supported | Keep OpenAI-specific `response_format` details in adapter. |
| Anthropic API | ProviderAdapter using tool-use/schema-like extraction where supported | Treat output as untrusted and validate locally. |
| Google Gemini API | ProviderAdapter using `response_format` structured output where supported | Gemini documents subset JSON Schema support, so keep schemas simple. |
| OpenRouter-compatible APIs | OpenAI-like ProviderAdapter with capability checks per model/provider | Require parameter support when requesting structured output. |
| Job posting URLs | Explicit user-triggered HTTP fetch with timeout and manual paste fallback | Do not promise universal scraping. Store fetched raw content locally. |

### Local Tools

| Tool | Integration Pattern | Notes |
|------|---------------------|-------|
| Tectonic | Sidecar or embedded library for LaTeX-to-PDF | Strong fit for local preview because it is self-contained and non-interactive. Validate package download behavior against offline/privacy expectations. |
| Pandoc | Sidecar fallback for DOCX or intermediate conversion | Useful but lossy for complex LaTeX. Prefer AST-to-DOCX for the main path. |
| SQLite | Core-owned local database | Use migrations and transactions. WAL is fine for local concurrency but backup correctly. |
| OS keychain or Tauri Stronghold | SecretStore implementation | Use for provider API keys. Avoid showing secrets to the webview. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend -> Core | Typed IPC commands | Frontend asks for operations; core enforces invariants. |
| Core -> Frontend | Command responses, progress events/channels | Use events/channels for compile progress and AI streaming. Avoid large JSON event payloads. |
| Domain -> Adapters | Traits/interfaces | Domain services should be testable with fake DB/provider/sidecar adapters. |
| AI -> ResumeService | Stored proposals only | No direct mutation. Apply only accepted proposal items. |
| TemplateService -> Preview/Export | Rendered source plus metadata | Preview/export should not know profile semantics. |

## Scalability Considerations

ResumeLab does not need server scalability in v1. The relevant scale is local document count, template complexity, provider variability, and open-source maintainability.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, personal tool | Single Tauri app, SQLite DB, one LaTeX template, one provider adapter, local compile. |
| 100-1,000 open-source users | Strong migrations, backup/restore, import/export profile JSON, provider capability matrix, packaging tests on Windows/macOS/Linux. |
| 10,000+ users/ecosystem | Template adapter API, telemetry only if explicitly opt-in and privacy-preserving, extension points for local AI providers, signed releases, stricter security review. |

### First Bottlenecks

1. **LaTeX preview latency:** Add debouncing, compile cancellation, revision-based cache keys, and diagnostics streaming.
2. **DOCX fidelity:** Generate from AST and constrain v1 template features. Do not wait until late roadmap phases to test DOCX.
3. **AI validation:** Require fact references in the proposal schema, then run deterministic validation before user review.
4. **Provider quirks:** Keep schemas simple and adapter-specific. Add fixtures for each provider response shape.
5. **SQLite backup with WAL:** Use SQLite backup mechanisms instead of naive file copy if WAL is enabled.

## Research Flags for Roadmap

| Phase Topic | Flag | Why |
|-------------|------|-----|
| DOCX export | Needs deeper phase research | Decide between AST-to-DOCX library, Pandoc fallback, or hybrid. Fidelity matters for resumes. |
| LaTeX preview packaging | Needs deeper phase research | Tectonic is promising, but offline behavior, package bundle size, and cross-platform sidecar packaging need validation. |
| Full DB encryption | Needs product/security decision | API keys definitely need secure storage; encrypting all profile data affects recovery, UX, support, and portability. |
| Multi-provider AI | Needs compatibility testing | Structured output and tool/schema support vary by provider and model. |
| Job link scraping | Defer and research later | Many job sites block scraping or render dynamically. Manual paste should remain primary. |
| Current resume upload | Keep narrow | Use as style/template context, not as canonical truth import, unless a later import phase is planned. |

## Sources

- HIGH confidence: Tauri Architecture, process model, and frontend/core split. https://v2.tauri.app/concept/architecture/ and https://v2.tauri.app/concept/process-model/
- HIGH confidence: Tauri command IPC, async commands, state, events/channels. https://v2.tauri.app/develop/calling-rust/ and https://v2.tauri.app/develop/calling-frontend/
- HIGH confidence: Tauri capabilities and security boundaries. https://v2.tauri.app/security/capabilities/ and https://v2.tauri.app/security/
- HIGH confidence: Tauri sidecars and shell permission model. https://v2.tauri.app/develop/sidecar/
- HIGH confidence: Tauri Stronghold secret storage plugin. https://v2.tauri.app/plugin/stronghold/
- HIGH confidence: Local-first principles and local device as primary copy. https://www.inkandswitch.com/essay/local-first/
- HIGH confidence: SQLite WAL behavior, concurrency, checkpointing, and backup caveats. https://www.sqlite.org/wal.html
- HIGH confidence: Tectonic self-contained LaTeX-to-PDF engine. https://tectonic-typesetting.github.io/en-US/index.html
- HIGH confidence: Pandoc format conversion and lossy conversion caveats. https://pandoc.org/MANUAL.html
- MEDIUM confidence: OpenAI structured output support, provider/model-specific. https://platform.openai.com/docs/guides/structured-outputs
- MEDIUM confidence: Anthropic tool-use documentation for structured tool interactions. https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview
- MEDIUM confidence: Google Gemini structured output and subset JSON Schema support. https://ai.google.dev/gemini-api/docs/structured-output
- MEDIUM confidence: OpenRouter structured outputs and provider routing caveats. https://openrouter.ai/docs/features/structured-outputs

---
*Architecture research for ResumeLab, prepared for roadmap phase planning.*
