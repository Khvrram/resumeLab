# Requirements: ResumeLab

**Defined:** 2026-05-14
**Core Value:** Generate accurate, ATS-friendly, job-tailored resumes from truthful local profile data while keeping the user in control of every factual claim.

## v1 Requirements

Requirements for the first usable local desktop release. Each maps to roadmap phases.

### Desktop and Privacy

- [ ] **DESK-01**: User can launch ResumeLab as a local desktop application without creating a hosted account.
- [ ] **DESK-02**: User can use core profile, resume editing, preview, and export features while offline.
- [ ] **DESK-03**: User can see and approve what resume/profile/job context will be sent before any AI provider call.
- [ ] **DESK-04**: User API keys are stored outside renderer-accessible state and are never saved in plain app settings, logs, prompts, or resume files.

### Profile Source of Truth

- [ ] **PROF-01**: User can create and edit contact/profile basics including name, headline, location, email, phone, links, and summary.
- [ ] **PROF-02**: User can create and edit work experience entries with company, role, location, date range, description, and bullet facts.
- [ ] **PROF-03**: User can create and edit project entries with title, links, date range, technologies, description, and bullet facts.
- [ ] **PROF-04**: User can create and edit education entries with school, degree, field, location, dates, and notes.
- [ ] **PROF-05**: User can create and edit skills grouped by category, proficiency/context, and related experience/project facts.
- [ ] **PROF-06**: User can create and edit optional certifications, awards, publications, volunteer work, and custom sections.
- [ ] **PROF-07**: User can identify which profile facts are eligible for resume generation and which facts should remain private or excluded.

### Resume Model and Templates

- [ ] **RESM-01**: User can create a resume draft from the structured profile source of truth.
- [ ] **RESM-02**: User can keep multiple job-specific resume drafts without mutating the master profile.
- [ ] **RESM-03**: User can use the existing LaTeX resume template as the initial v1 template.
- [ ] **RESM-04**: User can map structured resume sections to the LaTeX template without treating raw LaTeX as the only canonical state.
- [ ] **RESM-05**: User can reorder, include, exclude, and rename resume sections for a draft.
- [ ] **RESM-06**: User can restore a draft to a prior revision when tailoring or manual edits produce an unwanted result.

### LaTeX Editing and Preview

- [ ] **EDIT-01**: User can edit raw LaTeX for a resume draft in a code editor.
- [ ] **EDIT-02**: User can edit resume content through structured controls alongside the raw LaTeX view.
- [ ] **EDIT-03**: User can see a live PDF-style preview of the resume after LaTeX changes.
- [ ] **EDIT-04**: User can see LaTeX compile errors and warnings tied to the current draft.
- [ ] **EDIT-05**: User can recover from a broken LaTeX edit without losing the last successful preview.
- [ ] **EDIT-06**: User can switch between structured editing, LaTeX editing, and preview without losing unsaved work.

### Job Targeting and Review

- [ ] **JOB-01**: User can create a job target with role title, company, job link, and pasted job description.
- [ ] **JOB-02**: User can paste a job description manually when job-link fetching is unavailable or fails.
- [ ] **JOB-03**: User can review extracted role requirements, keywords, tools, responsibilities, and seniority signals before tailoring.
- [ ] **JOB-04**: User can compare a resume draft against a job target for keyword and requirement alignment.
- [ ] **JOB-05**: User can see alignment guidance without the app claiming a guaranteed ATS score or guaranteed interview outcome.

### AI Providers and Tailoring

- [ ] **AIPR-01**: User can configure provider keys for OpenAI, Anthropic, Google, and OpenRouter-compatible providers.
- [ ] **AIPR-02**: User can choose which configured provider/model is used for a tailoring run.
- [ ] **AIPR-03**: User can generate a tailored resume proposal from a job target and selected profile facts.
- [ ] **AIPR-04**: User can ask AI to rephrase, reorder, select, or emphasize existing truthful facts for a target job.
- [ ] **AIPR-05**: User can ask AI for targeted edits to a selected section or highlighted text.
- [ ] **AIPR-06**: User can see AI suggestions for missing factual content separately from resume-ready edits.
- [ ] **AIPR-07**: User can cancel an AI request and see provider errors, rate limits, and invalid-key states clearly.
- [ ] **AIPR-08**: User can view basic metadata for an AI run, including provider, model, job target, profile snapshot, and timestamp.

### Fact Governance

- [ ] **GOV-01**: User can review AI proposed changes as a diff before applying them to a resume draft.
- [ ] **GOV-02**: User can accept, reject, or manually edit each AI proposed change.
- [ ] **GOV-03**: User can see which source profile facts support each AI-generated bullet or section change.
- [ ] **GOV-04**: User can prevent unsupported AI claims from entering the resume unless explicitly approved as a user-authored override.
- [ ] **GOV-05**: User can turn an AI-suggested missing fact into a profile update only through explicit user confirmation.

### Export and Artifacts

- [ ] **EXPT-01**: User can export a resume draft as PDF from the LaTeX compile output.
- [ ] **EXPT-02**: User can export a resume draft as DOCX from structured resume data.
- [ ] **EXPT-03**: User can export the LaTeX source for a resume draft.
- [ ] **EXPT-04**: User can choose a local export destination and filename for each exported artifact.
- [ ] **EXPT-05**: User can see whether exported PDF/DOCX artifacts were generated from the current draft revision.

### Import Context and Backup

- [ ] **IMPT-01**: User can optionally attach an existing resume file to provide style and structure context for future tailoring.
- [ ] **IMPT-02**: User can use an attached existing resume as style context without automatically overwriting structured profile facts.
- [ ] **IMPT-03**: User can export a local backup of profile data, templates, job targets, and resume drafts.
- [ ] **IMPT-04**: User can restore a local backup without corrupting existing profile data or resume drafts.

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Templates

- **TMPL-01**: User can choose from a template gallery.
- **TMPL-02**: User can import third-party LaTeX templates through a guided template mapping flow.
- **TMPL-03**: User can customize template colors, fonts, spacing, and section styles without editing raw LaTeX.

### Job Search

- **JOBS-01**: User can track job applications and statuses.
- **JOBS-02**: User can generate tailored cover letters.
- **JOBS-03**: User can use a browser extension to capture job posts.
- **JOBS-04**: User can fetch and parse job links from major job boards with provider-specific fallbacks.

### AI and Providers

- **LOCL-01**: User can run tailoring through local LLM providers as a first-class path.
- **AIEX-01**: User can compare outputs across multiple providers for the same job target.
- **AIEX-02**: User can define custom tailoring prompts and reusable prompt profiles.

### Collaboration and Sync

- **SYNC-01**: User can opt into encrypted cloud sync.
- **SYNC-02**: User can collaborate with another reviewer on a resume draft.
- **SYNC-03**: User can share a read-only resume preview link.

### Advanced Editing

- **ADV-01**: User can navigate between PDF preview locations and LaTeX source locations with SyncTeX-style behavior.
- **ADV-02**: User can run deep grammar, tone, and impact scoring beyond basic alignment guidance.
- **ADV-03**: User can import facts from a resume with high-confidence extraction and review.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Hosted accounts and mandatory cloud storage | Conflicts with the local-first v1 privacy model. |
| AI directly inventing accomplishments, metrics, tools, employers, titles, dates, or credentials | Violates the core value and creates user risk. |
| Guaranteed ATS scores or interview guarantees | ATS behavior varies and cannot be honestly guaranteed. |
| Mass-apply automation | Distracts from the resume quality workflow and raises trust/safety concerns. |
| Perfect job-link scraping | Many job sites block scraping or render dynamically; manual paste is reliable for v1. |
| Perfect resume import | The profile database is the source of truth; uploaded resumes are optional style context in v1. |
| Template marketplace | The user already has a template; template breadth is less important than the core editing/tailoring loop. |
| Cloud sync, collaboration, and public sharing | Useful later, but not needed for the personal local-first v1. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 0
- Unmapped: 50

---
*Requirements defined: 2026-05-14*
*Last updated: 2026-05-14 after initial definition*
