# Feature Research

**Domain:** Local-first AI resume editor, ATS tailoring tool, and LaTeX resume workflow
**Project:** ResumeLab
**Researched:** 2026-05-14
**Confidence:** MEDIUM

## Feature Landscape

ResumeLab sits between three product categories:

1. **AI resume builders** such as Teal, Rezi, Kickresume, and Resume Worded. Users expect job-description matching, AI bullet rewrites, keyword analysis, resume scoring, imports, multiple versions, and PDF/DOCX export.
2. **ATS tailoring tools** such as Jobscan and Resume Worded. Users expect a report showing missing hard skills, soft skills, job-title alignment, formatting issues, section issues, and what to change before applying.
3. **Resume-as-code and LaTeX workflows** such as Overleaf, JSON Resume, HackMyResume, RenderCV, and newer Markdown/YAML tools. Users expect source-of-truth data, deterministic rendering, live preview, compile diagnostics, versionable output, and high-quality PDF generation.

The v1 wedge should not be "another AI resume builder." It should be: **a private career fact database that produces truthful, job-tailored LaTeX resumes with AI assistance and user-controlled exports.**

## Feature Categories

| Category | Product-Specific Meaning | v1 Importance |
|----------|--------------------------|---------------|
| Profile source of truth | Local structured data for experience, projects, education, skills, certifications, awards, links, and reusable bullet facts. | Critical |
| Job targeting | Paste a job description, store target role/company metadata, extract requirements, and compare against profile facts. | Critical |
| AI tailoring | Rephrase, reorder, select, and emphasize existing facts; suggest missing facts separately. | Critical |
| Truth/provenance controls | Prevent unsupported claims from entering the resume without explicit user approval. | Critical |
| LaTeX editing | Raw LaTeX editor plus PDF-style live preview and compile feedback. | Critical |
| Structured editing | Forms and section controls for canonical profile data and generated resume sections. | Critical |
| ATS/readability review | Keyword coverage, formatting risks, section headings, length, and impact checks with no false guarantee. | High |
| Export | PDF, DOCX, LaTeX source, and structured backup/export. | High |
| Privacy/provider control | Local storage, user-provided AI keys, provider selection, visible outbound context. | High |
| Resume versioning | Keep job-specific drafts tied to a job target without mutating the master profile. | High |
| Import/context | Existing resume upload for style and structure context, not as the primary source of truth. | Medium |
| Job-search adjacencies | Cover letters, job tracker, LinkedIn optimization, interview prep, browser extension. | Defer |

## Table Stakes (Users Expect These)

Features users assume exist. Missing these makes the product feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Local structured profile database | AI resume tools now center around a master resume or profile reused for many applications. Resume-as-code tools also treat resume data as portable structured source. | HIGH | v1 must support contact, summary/profile, work experience, projects, skills, education, certifications, awards, links, and custom sections. |
| Multiple job-specific resume drafts | Users expect to tailor a different resume for each job without losing the master resume. Teal explicitly positions multiple versions as a must-have. | MEDIUM | Store generated drafts separately from canonical profile facts. Tie each draft to role, company, job description, date, and export artifacts. |
| Job description paste flow | Jobscan, Resume Worded, Rezi, Kickresume, and Teal all anchor tailoring around comparing a resume to a specific job description. | MEDIUM | v1 should make manual paste the reliable path. Job-link fetch can be optional because many job sites block scraping. |
| Job requirement extraction | Users expect the app to identify hard skills, soft skills, responsibilities, keywords, seniority, education, and tools from the job post. | MEDIUM | Extract requirements into reviewable structured data before tailoring. Let users delete noisy keywords. |
| Missing keyword and match analysis | ATS tools show missing hard/soft skills and role-specific keyword gaps. Users will expect a report before export. | MEDIUM | Present as "alignment analysis," not a promise that an ATS will accept the resume. |
| AI bullet rewrite and summary generation | Rezi, Kickresume, Teal, Resume Worded, and Jobscan all include AI writing or one-click optimization workflows. | HIGH | Limit v1 AI to rephrasing and recombining stored facts. Show before/after diffs. |
| Selective AI edits | Users need to highlight a bullet, summary, or section and ask for a targeted rewrite rather than regenerate the whole resume. | MEDIUM | Include local selection context plus job target. Require accept/reject. |
| Truth gate for factual claims | AI resume tools create trust risk when they invent skills or outcomes. Kickresume explicitly says its tailoring uses only already-provided information. | HIGH | v1 must separate "tailored wording" from "new factual suggestion." New facts require user approval into the profile database. |
| Structured resume editor | Non-LaTeX editing is expected from resume builders. | HIGH | Users should be able to reorder sections, include/exclude bullets, edit structured fields, and regenerate selected sections. |
| Raw LaTeX editor | The project promises Overleaf-style control. LaTeX users expect source access, not only forms. | HIGH | Use the existing LaTeX template in v1. Avoid generalized template editing until core flow works. |
| Live PDF preview | Overleaf and LaTeX editor workflows set the expectation that source and rendered output stay close together. | HIGH | Recompile quickly after edits, debounce safely, and show stale/compiling/error states. |
| LaTeX compile diagnostics | LaTeX users expect error panes, line references, warnings, logs, and overfull/underfull box visibility. | MEDIUM | v1 should surface compiler errors with line/file where possible. Full AI error repair can wait. |
| ATS-safe formatting checks | Resume tools warn against columns, tables, images, unusual section headers, and parsing-hostile formatting. | MEDIUM | For a LaTeX template, provide checks for standard headings, selectable text, readable fonts, margins, and PDF text extraction. |
| One-page fit controls | Resume editing often means fitting content to a page without wrecking readability. | MEDIUM | v1 can provide basic included/excluded bullet controls and section ordering. Automated layout fitting can be v1.x. |
| Existing resume upload for style context | Teal and other builders support importing an existing resume. Users dislike starting from scratch. | HIGH | v1 should allow upload as style/reference context only. Do not promise perfect parsing or canonical import. |
| PDF export | PDF is the default professional resume format and natural output for LaTeX. | MEDIUM | Must be reliable before broader launch. |
| DOCX export | Many resume builders offer Word/DOCX, and some recruiters request editable files. | HIGH | v1 should support DOCX export, but accept that parity with LaTeX PDF may be imperfect. Make this explicit in UI. |
| Provider key settings | The project is open-source and local-first, so users expect to bring OpenAI, Anthropic, Google, and OpenRouter-compatible keys. | MEDIUM | Store keys securely in OS keychain if available. Show provider/model used per generation. |
| Outbound AI context preview | Privacy-sensitive users need to know what leaves their machine. | MEDIUM | Show the selected profile facts and job text that will be sent before AI calls. |
| Autosave, undo, and draft recovery | Resume editing is high-stakes document work. Losing edits is unacceptable. | MEDIUM | At minimum, autosave local drafts and support undo in editors. |
| Data export/backup | Local-first users expect to own their data. JSON Resume and similar ecosystems emphasize portable structured data. | MEDIUM | Export profile database and job drafts as JSON or project folder backup. |

## Differentiators (Competitive Advantage)

Features that set ResumeLab apart. These should align with the core value rather than compete feature-by-feature with large cloud job-search platforms.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Truth ledger with provenance | Makes AI tailoring trustworthy by linking every generated bullet back to stored facts. | HIGH | Each generated claim should cite profile facts or mark itself as unsupported suggestion. This is the strongest product differentiator. |
| Local-first career vault | Users get AI tailoring without turning their full career history into a cloud account. | MEDIUM | Store profile, job descriptions, LaTeX, and exports locally by default. AI calls are explicit exceptions. |
| BYO multi-provider AI | Open-source users can choose provider, cost, model, and data policy. | MEDIUM | Support OpenAI, Anthropic, Google, and OpenRouter-compatible APIs in v1 settings. |
| Structured profile plus raw LaTeX in one workflow | Most builders hide source; LaTeX workflows lack structured AI tailoring. This combination is distinctive. | HIGH | Keep structured profile as durable truth while letting generated LaTeX diverge per job draft. |
| Reviewable diff-first AI | Reduces fear of AI overwriting careful resume language. | MEDIUM | Show additions, deletions, and moved/reordered bullets before accepting. |
| Unsupported-fact suggestion queue | Converts AI "you should mention X" ideas into a controlled user workflow. | MEDIUM | Suggestions can become profile facts only after the user writes or approves the factual detail. |
| Job-specific section/bullet selection | Similar to Teal Auto-Select, but grounded in a local career database and user review. | HIGH | AI proposes which bullets/projects/skills to include; user controls final inclusion. |
| Unified diagnostics panel | Combine LaTeX compile errors, ATS/readability checks, keyword gaps, and truth/provenance warnings. | HIGH | This is more useful than a single opaque score. Build after basic preview is stable. |
| Resume-as-code export path | Developers and technical users can keep LaTeX source and structured JSON under version control. | LOW | Export source and JSON. Native Git integration can wait. |
| Application history with artifacts | The user can see which resume was sent to which company and reproduce it later. | MEDIUM | Store generated PDF/DOCX path, source snapshot, provider/model, and job text hash. |
| Style preservation from uploaded resume | Keeps future outputs close to the user's existing voice and section structure without making import canonical. | HIGH | v1 can use uploaded resume as style/context only. v2 can parse it into editable facts. |
| Transparent ATS caveats | Builds trust by refusing fake precision. | LOW | Explain that match scores are advisory and ATS behavior varies. Prefer actionable checks over "guaranteed pass." |
| Tag-based targeting views | Users can tag facts by role theme such as backend, frontend, ML, leadership, startup, enterprise. | MEDIUM | Strong v1.x/v2 differentiator. Resumx-like tagged views are valuable but not required for first launch. |

## Anti-Features (Commonly Requested, Often Problematic)

Features that seem attractive but create scope, trust, or product-quality problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| "Guaranteed ATS pass" or fake ATS score | Users want certainty before applying. | ATS systems vary, recruiter workflows vary, and even Jobscan frames match rate as a tool-specific visualization. False guarantees damage trust. | Provide keyword/format/readability checks with caveats and prioritized fixes. |
| Fully autonomous factual rewriting | It looks faster than reviewing edits. | AI can invent outcomes, tools, scope, seniority, or credentials. This violates ResumeLab's core value. | Permit wording changes only from stored facts; route new facts to a suggestion queue. |
| One-click mass tailoring or mass apply | Users applying to many jobs want speed. | Encourages low-quality applications, factual drift, and weak review. It also pulls the app toward job-board automation. | Make per-job tailoring fast but review-driven. |
| Perfect PDF/DOCX resume import | Users dislike manual data entry. | Resume parsing is noisy, especially with complex PDFs. Bad imports corrupt the source of truth. | v1: import as style/context. v1.x/v2: assisted parser with field-by-field confirmation. |
| Template marketplace | Templates are visible and easy to sell. | It distracts from the harder core workflow: truthful AI tailoring plus reliable LaTeX rendering/export. | v1: one strong LaTeX template. v1.x: template variables. v2: gallery only after workflow validation. |
| Canva-style visual designer | Users like drag-and-drop control. | It conflicts with ATS-safe structure and LaTeX source integrity. It also explodes export complexity. | Provide structured controls, include/exclude toggles, spacing controls, and raw LaTeX for precision. |
| Cloud accounts and sync | Users expect modern apps to sync. | It breaks the local-first privacy promise and creates backend/security burden. | Local project folders and explicit backup/export. Cloud sync can be a separate optional v2+ plugin. |
| Job board scraping as a core feature | Pasting URLs feels easier than pasting job descriptions. | Job sites block scraping, render dynamically, and change markup. It creates brittle work before the core product is proven. | v1: manual paste. v1.x: best-effort URL fetch with paste fallback. |
| Cover letters, LinkedIn optimization, interview prep | Competitors bundle these as career suites. | They dilute v1 and delay the core resume editor. | Defer until resume workflow is validated. |
| AI career coach or autonomous agent | Rezi and other tools market agentic workflows. | Conversation-first agents can obscure what changed and why, and they complicate truth enforcement. | v1: explicit commands and diffs. v2: agent only if it operates through reviewable actions. |
| AI-authorship detector or evasion tooling | Users worry about AI detection. | It is outside the core value and can become ethically muddy. | Focus on authentic, accurate, user-reviewed writing. |
| Public share links/analytics | Common in cloud builders. | Requires hosting, accounts, permissions, and privacy tradeoffs. | Export files locally. Optional static share bundle can wait. |

## Feature Dependencies

```text
Local structured profile
  -> Truth gate
  -> AI tailoring from existing facts
  -> Job-specific resume drafts
  -> PDF/DOCX export

Job description paste
  -> Requirement extraction
  -> Keyword/match analysis
  -> Bullet/section selection
  -> Tailored resume draft

Existing LaTeX template
  -> Raw LaTeX editor
  -> Live PDF preview
  -> Compile diagnostics
  -> Reliable PDF export

Provider key settings
  -> AI model selection
  -> Outbound context preview
  -> AI generation logs

Application draft storage
  -> Version history
  -> Re-export
  -> Later job tracker integration
```

### Dependency Notes

- **AI tailoring requires the profile database:** Without canonical facts, the product collapses into a generic AI writer and cannot enforce truth.
- **Keyword analysis requires job ingestion first:** Requirement extraction should happen before resume generation so the user can correct noisy or irrelevant terms.
- **DOCX export depends on stable document structure:** If the v1 LaTeX template is too bespoke, DOCX parity will be fragile. Define a structured intermediate resume model before export.
- **Raw LaTeX edits can diverge from structured data:** v1 should treat generated resumes as editable outputs. Do not try to reverse-parse every LaTeX edit back into profile facts.
- **Existing resume upload conflicts with profile truth if overpromised:** Use it as style/context in v1 unless parsed fields are explicitly reviewed by the user.

## MVP Definition

### Launch With (v1)

Minimum product needed to validate ResumeLab's core value.

- [ ] Local profile database for contact info, work, projects, education, skills, certifications, links, and custom facts.
- [ ] One integrated LaTeX resume template based on the user's existing template.
- [ ] Structured editor for the profile and for generated resume section inclusion/order.
- [ ] Raw LaTeX editor with live PDF preview.
- [ ] LaTeX compile status, error list, and readable log access.
- [ ] Job description paste with role/company metadata.
- [ ] Requirement extraction for hard skills, soft skills, responsibilities, tools, education, and seniority.
- [ ] Keyword/alignment report with missing terms and formatting/readability warnings.
- [ ] AI provider settings for OpenAI, Anthropic, Google, and OpenRouter-compatible providers.
- [ ] Outbound context preview before AI calls.
- [ ] AI tailored draft generation using only stored profile facts.
- [ ] Diff-first accept/reject workflow for AI changes.
- [ ] Unsupported-fact suggestion queue instead of silent invented claims.
- [ ] Optional existing resume upload as style/structure context only.
- [ ] Manual targeted AI edits for selected bullets/sections.
- [ ] Job-specific draft storage and re-openable history.
- [ ] PDF export.
- [ ] DOCX export with documented limitations if exact LaTeX parity is not possible.
- [ ] Structured data backup/export.

### Add After Validation (v1.x)

Add once the core loop is useful and reliable.

- [ ] Best-effort job URL ingestion with mandatory paste fallback.
- [ ] Assisted import parser for PDF/DOCX/LinkedIn with field-by-field confirmation.
- [ ] Better one-page fit tools: density presets, bullet inclusion budget, section spacing controls.
- [ ] SyncTeX-style source/preview jump if the LaTeX pipeline supports it cleanly.
- [ ] AI compile-error explanation and suggested fixes.
- [ ] Tag-based profile facts and role views.
- [ ] More detailed match report with grouped must-have, nice-to-have, and noisy keywords.
- [ ] Export package per application: PDF, DOCX, LaTeX source, job description, and generation metadata.
- [ ] Prompt/model audit log for reproducibility.
- [ ] Limited template variables: font size, margins, section order, contact layout.

### Future Consideration (v2+)

Defer until the v1 resume workflow is validated.

- [ ] Template gallery or marketplace.
- [ ] Cloud sync, accounts, collaboration, or share links.
- [ ] Job application tracker and browser extension.
- [ ] Cover letter generator.
- [ ] LinkedIn profile optimizer.
- [ ] Interview prep and recruiter email templates.
- [ ] Batch tailoring or campaign workflows.
- [ ] Mobile/web companion app.
- [ ] Full agentic career coach.
- [ ] Multi-user review/comment workflow.
- [ ] Analytics on application outcomes.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Local profile database | HIGH | HIGH | P1 |
| One LaTeX template integration | HIGH | MEDIUM | P1 |
| Structured profile editor | HIGH | HIGH | P1 |
| Raw LaTeX editor | HIGH | MEDIUM | P1 |
| Live PDF preview | HIGH | HIGH | P1 |
| Compile diagnostics | HIGH | MEDIUM | P1 |
| Job description paste | HIGH | MEDIUM | P1 |
| Requirement extraction | HIGH | MEDIUM | P1 |
| AI provider settings | HIGH | MEDIUM | P1 |
| Outbound context preview | HIGH | LOW | P1 |
| AI tailored draft from stored facts | HIGH | HIGH | P1 |
| Truth gate and unsupported suggestion queue | HIGH | HIGH | P1 |
| Diff-first AI review | HIGH | MEDIUM | P1 |
| PDF export | HIGH | MEDIUM | P1 |
| DOCX export | HIGH | HIGH | P1 |
| Existing resume style context | MEDIUM | MEDIUM | P1 |
| Keyword/alignment report | HIGH | MEDIUM | P1 |
| Application draft history | HIGH | MEDIUM | P1 |
| One-page fit controls | MEDIUM | MEDIUM | P2 |
| Job URL ingestion | MEDIUM | MEDIUM | P2 |
| Assisted resume import parser | HIGH | HIGH | P2 |
| AI compile-error repair | MEDIUM | MEDIUM | P2 |
| Tag-based role views | MEDIUM | MEDIUM | P2 |
| Template variable controls | MEDIUM | MEDIUM | P2 |
| Job tracker | MEDIUM | HIGH | P3 |
| Cover letters | MEDIUM | MEDIUM | P3 |
| Template gallery | LOW | HIGH | P3 |
| Cloud sync/accounts | LOW | HIGH | P3 |
| Browser extension | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have after the core loop works
- P3: Useful later, but not part of the v1 product promise

## Competitor Feature Analysis

| Feature | Market Pattern | Our Approach |
|---------|----------------|--------------|
| Job description matching | Teal, Jobscan, Resume Worded, Rezi, and Kickresume compare resume content to a target job. | Include in v1, but make it advisory and tied to truthful stored facts. |
| Missing keyword report | Jobscan and Resume Worded foreground hard/soft skill gaps and match rate. | Include missing keyword analysis, grouped by relevance and source requirement. Avoid fake certainty. |
| AI rewrites | Rezi, Teal, Kickresume, and Resume Worded generate bullets, summaries, and suggested lines. | Include targeted rewrites with diffs. Do not write unsupported facts directly into the resume. |
| Auto-select relevant content | Teal Auto-Select curates resume content against a job description. | Build a reviewed "suggested inclusion" workflow from the local career vault. |
| Existing resume import | Teal supports PDF, Word, text, and LinkedIn import. Many builders use import to reduce setup friction. | v1 supports upload as style/context. Defer canonical parsing until field confirmation exists. |
| Resume score | Jobscan, Resume Worded, Rezi, and Teal show scores or match rates. | Use diagnostics and prioritization. If a score is used, label it as ResumeLab's internal alignment score only. |
| Templates/design | Resume builders compete on templates and customization. Reactive Resume offers templates and privacy. | Start with one strong LaTeX template. Differentiate on control, truth, and local privacy instead of gallery size. |
| Export | Teal highlights unlimited PDF/Word downloads; HackMyResume exports many formats from one source. | v1 supports PDF and DOCX, plus LaTeX/source backup. |
| LaTeX editing | Overleaf sets expectations for code editor, preview, errors, and source/PDF navigation. | Include code editor and preview in v1. Defer SyncTeX-grade navigation if it slows core launch. |
| Open-source/privacy | Reactive Resume and HackMyResume prove users value free/open/private resume tooling. | Make local-first and no hosted account core to the product, not a pricing feature. |
| Job-search suite | Teal and Jobscan bundle job tracking, cover letters, LinkedIn, and interview prep. | Defer. ResumeLab should first win the resume tailoring/editing workflow. |

## Recommended v1 Scope

v1 should optimize for this loop:

```text
Enter truthful facts -> Paste job description -> Review extracted requirements
-> Generate tailored LaTeX resume draft from stored facts
-> Review diffs and unsupported suggestions -> Edit structured fields or LaTeX
-> Preview PDF -> Export PDF/DOCX
```

Do not make v1 depend on perfect import, scraping, templates, job tracking, cover letters, or cloud sync. Those are all plausible later, but they are not the core value. The core value is trustworthy, local, job-specific resume generation where the user controls every factual claim.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| AI resume builder table stakes | HIGH | Verified through current official pages for Teal, Rezi, Kickresume, Jobscan, and Resume Worded. |
| ATS tailoring expectations | HIGH | Verified through official Jobscan and Resume Worded pages. Exact ATS behavior varies, so avoid strong claims. |
| LaTeX workflow expectations | HIGH | Verified through official Overleaf docs for editor/preview, compile errors, code check, and SyncTeX-style navigation. |
| Open-source/local-first expectations | MEDIUM | Verified through Reactive Resume, JSON Resume, HackMyResume, RenderCV, and related tools. Feature demand is inferred from ecosystem patterns. |
| v1 prioritization | MEDIUM | Product-specific recommendation based on project constraints and competitor patterns. Needs validation with actual users. |
| DOCX parity | MEDIUM | Users expect DOCX export, but exact conversion quality depends on implementation architecture. Flag for deeper technical research. |

## Sources

- Teal Resume Builder, official product page: https://www.tealhq.com/tools/resume-builder
- Teal Auto-Select docs: https://help.tealhq.com/en/articles/9923251-using-job-matching-resume-curation
- Rezi AI Keyword Targeting docs: https://www.rezi.ai/rezi-docs/ai-keyword-targeting-explained
- Rezi AI Resume Builder page: https://www.rezi.ai/ai-resume-builder
- Kickresume Resume Tailoring page: https://www.kickresume.com/en/resume-tailoring/
- Resume Worded Targeted Resume page: https://www.resumeworded.com/targeted-resume
- Jobscan Resume Scanner page: https://www.jobscan.co/resume-scanner
- Jobscan support, match-rate inputs: https://support.jobscan.co/hc/en-us/articles/42869628183699-What-exactly-is-being-checked-Can-you-rate-my-resume
- Overleaf features overview: https://www.overleaf.com/about/features-overview
- Overleaf fixing LaTeX errors docs: https://docs.overleaf.com/troubleshooting-and-support/fixing-latex-errors
- Overleaf editor/PDF navigation docs: https://docs.overleaf.com/navigating-in-the-editor/working-with-the-pdf-viewer/moving-between-the-editor-and-pdf
- Overleaf Code Check docs: https://docs.overleaf.com/troubleshooting-and-support/code-check
- Reactive Resume official site: https://rxresu.me/
- JSON Resume schema docs: https://docs.jsonresume.org/schema
- HackMyResume GitHub README: https://github.com/hacksalot/HackMyResume
- RenderCV architecture docs: https://docs.rendercv.com/developer_guide/understanding_rendercv/
- Resumx official site: https://resumx.dev/

---
*Feature research for: ResumeLab*
*Researched: 2026-05-14*
