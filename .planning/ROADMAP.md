# Roadmap: ResumeLab

## Overview

ResumeLab v1 moves from trusted local data to a complete resume tailoring loop: first the local desktop profile vault, then the structured resume document and LaTeX editing pipeline, then job targeting and manual alignment, then AI tailoring with privacy and fact governance, and finally export, import context, backup, and offline release readiness. The phase order keeps the high-risk boundaries early: trust and storage before documents, documents before AI, and AI before release hardening.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Local Profile Vault** - User can run a no-account desktop app and manage truthful profile facts locally.
- [ ] **Phase 2: Resume Template and Editing Loop** - User can create structured resume drafts, edit LaTeX, preview PDFs, and recover revisions.
- [ ] **Phase 3: Job Targeting and Alignment** - User can define job targets and compare drafts against role requirements without AI.
- [ ] **Phase 4: AI Tailoring and Fact Governance** - User can run provider-based tailoring through egress review, diffs, provenance, and explicit approval.
- [ ] **Phase 5: Export, Import, and Offline Release** - User can export final artifacts, use style context safely, back up data, restore data, and verify offline workflows.

## Phase Details

### Phase 1: Local Profile Vault
**Goal**: Users can launch ResumeLab locally and maintain the structured profile facts that resumes will cite.
**Depends on**: Nothing (first phase)
**Requirements**: DESK-01, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07
**Success Criteria** (what must be TRUE):
  1. User can launch ResumeLab as a local desktop application without creating a hosted account.
  2. User can create, edit, quit, reopen, and still see contact basics, work experience, projects, education, skills, and optional sections from local storage.
  3. User can group skills and relate profile facts to relevant experience or project context.
  4. User can mark profile facts as eligible, private, or excluded before resume generation uses them.
**Plans**: TBD
**UI hint**: yes

### Phase 2: Resume Template and Editing Loop
**Goal**: Users can create durable resume drafts from profile facts and edit them through structured controls, raw LaTeX, and live preview.
**Depends on**: Phase 1
**Requirements**: RESM-01, RESM-02, RESM-03, RESM-04, RESM-05, RESM-06, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06
**Success Criteria** (what must be TRUE):
  1. User can create multiple job-specific resume drafts from structured profile facts without mutating the master profile.
  2. User can use the existing LaTeX resume template through mapped structured sections rather than treating raw LaTeX as the only canonical state.
  3. User can include, exclude, reorder, and rename resume sections and edit resume content through structured controls.
  4. User can edit raw LaTeX, switch between structured editing, LaTeX editing, and preview, and keep unsaved work intact.
  5. User can see live PDF-style preview, compile errors and warnings, keep the last successful preview after a broken LaTeX edit, and restore prior draft revisions.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Job Targeting and Alignment
**Goal**: Users can define job targets and understand how a draft aligns with a role before AI is required.
**Depends on**: Phase 2
**Requirements**: JOB-01, JOB-02, JOB-03, JOB-04, JOB-05
**Success Criteria** (what must be TRUE):
  1. User can create a job target with role title, company, job link, and pasted job description.
  2. User can paste a job description manually when job-link fetching is unavailable or fails.
  3. User can review extracted role requirements, keywords, tools, responsibilities, and seniority signals before tailoring.
  4. User can compare a resume draft against a job target and see advisory keyword and requirement alignment without guaranteed ATS score or interview-outcome claims.
**Plans**: TBD
**UI hint**: yes

### Phase 4: AI Tailoring and Fact Governance
**Goal**: Users can run AI tailoring through chosen providers while controlling egress, secrets, proposed changes, and unsupported claims.
**Depends on**: Phase 3
**Requirements**: DESK-03, DESK-04, AIPR-01, AIPR-02, AIPR-03, AIPR-04, AIPR-05, AIPR-06, AIPR-07, AIPR-08, GOV-01, GOV-02, GOV-03, GOV-04, GOV-05
**Success Criteria** (what must be TRUE):
  1. User can configure OpenAI, Anthropic, Google, and OpenRouter-compatible providers, choose a provider/model per run, and keep keys out of renderer-accessible state, plain app settings, logs, prompts, and resume files.
  2. User can preview and approve the profile, resume, and job context that will be sent before any AI provider call.
  3. User can generate a tailored proposal or targeted section/highlight edit from selected profile facts and a job target, cancel the request, and see provider errors, rate limits, and invalid-key states clearly.
  4. User can review proposed changes as diffs, see provider/model/job/profile snapshot/timestamp metadata and supporting source facts, then accept, reject, or manually edit each change.
  5. Unsupported claims and missing factual additions remain separate from resume-ready edits and require explicit user confirmation or a user-authored override before entering a draft or profile.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Export, Import, and Offline Release
**Goal**: Users can produce final artifacts, attach style context safely, back up and restore local work, and confirm core workflows run offline.
**Depends on**: Phase 4
**Requirements**: DESK-02, EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05, IMPT-01, IMPT-02, IMPT-03, IMPT-04
**Success Criteria** (what must be TRUE):
  1. User can export the current resume draft as PDF from the latest LaTeX compile output, DOCX from structured resume data, and LaTeX source.
  2. User can choose a local destination and filename for each artifact and see whether PDF/DOCX exports were generated from the current draft revision.
  3. User can attach an existing resume file as style and structure context without automatically overwriting structured profile facts.
  4. User can export and restore a local backup of profile data, templates, job targets, and resume drafts without corrupting existing data.
  5. User can use core profile, resume editing, preview, and export features while offline; network access is only needed after explicit AI action.
**Plans**: TBD
**UI hint**: yes

## Requirement Coverage

| Phase | Requirement Count |
|-------|-------------------|
| 1. Local Profile Vault | 8 |
| 2. Resume Template and Editing Loop | 12 |
| 3. Job Targeting and Alignment | 5 |
| 4. AI Tailoring and Fact Governance | 15 |
| 5. Export, Import, and Offline Release | 10 |

**Coverage:** 50/50 v1 requirements mapped. No orphaned requirements. No duplicate requirement mappings.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Local Profile Vault | 0/TBD | Not started | - |
| 2. Resume Template and Editing Loop | 0/TBD | Not started | - |
| 3. Job Targeting and Alignment | 0/TBD | Not started | - |
| 4. AI Tailoring and Fact Governance | 0/TBD | Not started | - |
| 5. Export, Import, and Offline Release | 0/TBD | Not started | - |
