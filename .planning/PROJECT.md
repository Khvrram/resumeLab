# ResumeLab

## What This Is

ResumeLab is a local-first, open-source desktop resume editor for building and tailoring resumes from a structured profile database. The user stores truthful career data such as projects, skills, education, experience, and other reusable facts, then generates a job-specific resume from a pasted job description or job link using AI.

The app supports both structured editing and direct LaTeX editing with a live preview, similar to an Overleaf-style workflow. AI can tailor wording, emphasis, ordering, and suggestions for a target role, but the user remains in control of factual content and final edits before exporting PDF or DOCX.

## Core Value

Generate accurate, ATS-friendly, job-tailored resumes from truthful local profile data while keeping the user in control of every factual claim.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] User can maintain a local structured profile database for education, experience, projects, skills, and related resume facts.
- [ ] User can edit generated resumes through both structured controls and raw LaTeX.
- [ ] User can see a live PDF-style preview while editing LaTeX resume content.
- [ ] User can use an existing LaTeX resume template as the initial v1 template.
- [ ] User can paste a job description or job link to create a tailored resume draft.
- [ ] User can provide API keys for multiple AI providers, including OpenAI, Anthropic, Google, and OpenRouter-compatible providers.
- [ ] AI can rephrase, reorder, emphasize, and tailor existing truthful content for ATS alignment.
- [ ] AI can suggest missing factual additions, but cannot directly invent or commit new factual claims.
- [ ] User can optionally upload an existing resume so AI can keep future outputs similar in style and structure.
- [ ] User can manually edit or highlight sections for targeted AI edits before export.
- [ ] User can export tailored resumes as PDF and DOCX.

### Out of Scope

- Cloud-hosted user accounts or sync - v1 is local-first and offline except explicit AI calls.
- Fully autonomous factual rewriting - AI may not add unsupported claims to the resume.
- Perfect resume import - current resume upload is optional context for style matching, not the primary source of truth.
- Template marketplace or large template gallery - v1 starts from the user's existing LaTeX template.
- Guaranteed job-link scraping for every site - users can paste the job description manually when scraping fails.

## Context

The project starts as a personal tool, then should be clean enough to become an open-source desktop application. The primary user is the project owner first, with later users likely being job seekers who want a privacy-preserving resume tailoring workflow.

The desired workflow is:

1. User enters or imports truthful profile data into local storage.
2. User optionally uploads a current resume so the app can learn preferred style and structure.
3. User pastes a job link or job description.
4. AI analyzes the target role and proposes a tailored resume based only on stored facts.
5. User edits structured fields, raw LaTeX, or selected highlighted sections.
6. User previews changes live and exports PDF or DOCX.

The editor should feel similar to Overleaf for the resume document itself: LaTeX source and rendered preview stay close together, and edits should be visible quickly. The structured profile database remains the durable source of truth, while generated resumes are editable outputs that can diverge for a specific job application.

## Constraints

- **Runtime**: Desktop app - the first usable version should run locally as a desktop application.
- **Desktop stack**: Electron, not Tauri/Rust - the project owner explicitly rejected Rust after initial scaffolding.
- **Privacy**: Offline except AI calls - profile data and resumes should stay local unless the user explicitly sends selected context to an AI provider.
- **AI providers**: User-supplied keys - v1 should let users configure keys for OpenAI, Anthropic, Google, and OpenRouter-style providers rather than relying on a hosted backend.
- **Factual accuracy**: AI cannot invent facts - it may rephrase existing truths and suggest additions for user approval, but factual additions require explicit user action.
- **Editing model**: Both structured and raw LaTeX editing are required - users need forms for profile truth plus direct LaTeX control for final resume polish.
- **Templates**: Start with one existing LaTeX template - avoid building a gallery before the core generation and editing workflow works.
- **Job ingestion**: Manual paste fallback required - links may fail because job sites block scraping or use dynamic content.
- **Export**: PDF and DOCX are expected outputs - PDF is natural from LaTeX, DOCX needs explicit conversion support.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build a desktop app first | The product should feel local, private, and self-contained rather than hosted. | - Pending |
| Use Electron instead of Tauri/Rust | The project owner strongly prefers not to use Rust; Electron keeps the desktop model while using Node for local privileged work. | - Pending |
| Use a structured profile database as the source of truth | Job-specific resumes can be regenerated without losing canonical career facts. | - Pending |
| Support both structured editing and raw LaTeX editing | Structured data keeps facts reusable; LaTeX gives precise control over final formatting. | - Pending |
| Use the user's existing LaTeX template for v1 | The fastest path to a useful v1 is making one strong template work well. | - Pending |
| Support multiple AI providers through user-owned keys | Open-source users should be able to choose OpenAI, Anthropic, Google, OpenRouter, or similar services. | - Pending |
| Limit AI to tailoring truthful content and suggesting factual additions | Resume integrity matters more than aggressive optimization. | - Pending |
| Treat current resume upload as optional style context | The structured profile remains canonical, while uploaded resumes help preserve voice and layout. | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after Electron stack override*
