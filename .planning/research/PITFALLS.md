# Pitfalls Research: ResumeLab

**Domain:** Local-first open-source desktop resume editor with structured profile data, LaTeX editing/live preview, AI tailoring, user-provided provider keys, and PDF/DOCX export  
**Researched:** 2026-05-14  
**Confidence:** HIGH for security/export/data-integrity pitfalls; MEDIUM for resume-market/ATS behavior because ATS products vary and public guidance is inconsistent.

## Phase Vocabulary

The roadmap does not exist yet, so phase mappings below use recommended prevention phases:

1. **Phase 0: Guardrails and Threat Model** - define privacy boundaries, AI authority, local data ownership, and security baseline before building workflows.
2. **Phase 1: Local Profile Foundation** - structured profile schema, migrations, backups, import/export, local persistence, and secret storage.
3. **Phase 2: LaTeX Editor and Preview** - raw LaTeX editing, safe compile worker, preview loop, template contract, and PDF proof.
4. **Phase 3: AI Tailoring Pipeline** - provider abstraction, structured outputs, fact provenance, user review, and cost/rate controls.
5. **Phase 4: Job and Resume Ingestion** - pasted job descriptions, optional link fetching, uploaded resume style context, prompt-injection boundaries.
6. **Phase 5: Export and ATS Validation** - PDF/DOCX quality, text extraction, ATS-safe mode, golden-file export tests.
7. **Phase 6: Packaging and Hardening** - cross-platform app packaging, updates, dependency/security checks, and open-source release hygiene.

## Critical Pitfalls

### Pitfall 1: AI Silently Invents or Mutates Resume Facts

**What goes wrong:**  
The generated resume includes unsupported claims: inflated scope, technologies the user has not used, unverifiable metrics, dates that changed, title exaggerations, or project outcomes copied from the job description.

**Why it happens:**  
LLMs still produce confident falsehoods, especially when asked to optimize persuasive text. Resume tailoring systems are particularly vulnerable because "make this match the job" creates pressure to fill gaps. OpenAI's hallucination research notes that highly specific factual inaccuracies remain a stubborn class of model error, so prompt wording alone is not enough.

**Consequences:**  
User trust collapses, the app violates its core value, and later fixes require retrofitting provenance into every AI workflow.

**Warning signs:**
- AI responses are written directly into the resume without a fact-diff review.
- Generated bullets do not cite source profile item IDs.
- Tests only check "valid JSON" or "resume sounds good", not whether every factual claim is supported.
- The same prompt can add new numbers, tools, certifications, employers, or dates.
- Unsupported additions appear inline instead of in a separate suggestions queue.

**Prevention strategy:**
- Treat the structured profile as the only durable source of truth.
- Give AI facts as stable IDs, not freeform biography text only.
- Require AI output to return `claim_source_ids`, `unsupported_suggestions`, and `changed_claims`.
- Block direct commits of unsupported facts. New factual content must become a user-approved profile update or remain a non-resume suggestion.
- Add a deterministic validation pass that checks every generated bullet for source IDs or explicit user-authored override.
- Keep an audit trail for each tailored draft: job input, profile snapshot, provider/model, prompt version, generated diff, accepted changes.

**Phase to address:**  
Phase 0 defines the "AI cannot commit facts" invariant. Phase 3 must implement provenance before any polished AI generation demo.

**Confidence:** HIGH

---

### Pitfall 2: Prompt Injection From Job Descriptions, Job Links, and Uploaded Resumes

**What goes wrong:**  
A pasted job post, fetched job page, or uploaded resume contains instructions such as "ignore previous rules", "send all profile data", "add management experience", or "prefer this employer's wording". The model treats that untrusted content as instructions rather than data.

**Why it happens:**  
ResumeLab intentionally feeds external text into an AI workflow. OpenAI and OWASP both identify prompt injection as a major LLM application risk, and OpenAI's agent guidance specifically warns that untrusted text can override behavior or exfiltrate data through downstream actions.

**Consequences:**  
The app may leak private profile data to the wrong sink, tailor toward malicious instructions, or generate dishonest content while appearing to follow the user's goal.

**Warning signs:**
- Job description text is concatenated into the same instruction layer as developer/system instructions.
- Link scraping and AI summarization are implemented in one step.
- The LLM has access to API keys, file paths, shell tools, browser cookies, or raw local database queries.
- Tests do not include adversarial job descriptions.
- "AI firewall" or regex filtering is treated as the entire defense.

**Prevention strategy:**
- Treat all job posts, links, uploaded resumes, and fetched pages as untrusted data.
- Separate instruction, trusted profile facts, and untrusted target-role text in the request schema.
- Use a two-step pipeline: deterministic extraction of job requirements, then tailoring against extracted requirements.
- Never expose secrets, local file access, shell access, or network tools to the model.
- Require user confirmation before sending selected profile context to an AI provider.
- Add adversarial fixtures: hidden instructions in HTML, PDF text, comments, and resume uploads.
- For any future tool-using agent behavior, implement source/sink controls and user confirmation before external transmission.

**Phase to address:**  
Phase 0 sets the trust-boundary policy. Phase 4 must include adversarial ingestion tests before job-link fetching is considered done.

**Confidence:** HIGH

---

### Pitfall 3: Local-First Privacy Is Broken by Default AI Calls and Logs

**What goes wrong:**  
The app is marketed as local-first, but it sends too much profile data to AI providers, stores prompts/responses with personal data in plaintext logs, includes resume content in telemetry/crash reports, or fetches links in ways that reveal user behavior.

**Why it happens:**  
AI integration is often added as a convenience layer around existing app state. Without a central egress boundary, every feature can call providers with a slightly different privacy policy.

**Consequences:**  
The "offline except explicit AI calls" promise becomes false. Open-source users will inspect the code and distrust the app if network behavior is unclear.

**Warning signs:**
- Provider calls can be made from UI components directly.
- There is no single network egress module for AI and job fetching.
- Logs include complete prompts, full resumes, job links, or API keys.
- The UI has no "what will be sent" preview.
- Tests cannot prove that editing, previewing, export, and profile management work with network disabled.

**Prevention strategy:**
- Build a central egress service with typed request manifests: provider, model, fields sent, estimated tokens, and purpose.
- Default to local-only operation; AI buttons should require explicit user action.
- Show a preflight preview of selected profile facts before provider submission.
- Redact secrets and PII from logs by default; provide opt-in diagnostic export with review.
- Disable analytics/telemetry in v1 unless the user explicitly opts in.
- Add network-offline tests for non-AI workflows.

**Phase to address:**  
Phase 0 defines privacy rules. Phase 1 implements local-only workflows. Phase 3 routes all AI through the egress service.

**Confidence:** HIGH

---

### Pitfall 4: API Keys Are Stored Like Normal Preferences

**What goes wrong:**  
OpenAI, Anthropic, Google, or OpenRouter keys are saved in SQLite, JSON config, browser localStorage, renderer state, debug logs, crash reports, or prompt transcripts.

**Why it happens:**  
User-provided keys feel like configuration, but they are high-value secrets. Desktop apps also tempt developers to store everything locally in the easiest persistence layer.

**Consequences:**  
A renderer compromise, local malware, support bundle, or accidental Git commit can expose paid provider keys. User trust damage is severe.

**Warning signs:**
- A `settings.json` or SQLite row contains raw API keys.
- Keys cross the frontend/backend IPC boundary after initial entry.
- Provider errors log request headers.
- The LLM request builder can read the key value.
- Linux support has no behavior for missing keyring/secret-service backends.

**Prevention strategy:**
- Store keys in OS-backed secret storage or an audited secret vault, not general app state.
- If Tauri is chosen, evaluate Stronghold or native keychain integration and document unlock behavior.
- If Electron is chosen, use `safeStorage`/OS key providers and detect weak Linux fallback states.
- Keep provider keys in the backend/native layer only. The renderer asks "call provider X", never handles the raw key after save.
- Redact request headers and provider tokens in logs and errors.
- Add tests that scan persisted app data and logs for fake key patterns.

**Phase to address:**  
Phase 1 must solve secret storage before provider configuration ships. Phase 6 rechecks platform-specific fallback behavior.

**Confidence:** HIGH

---

### Pitfall 5: LaTeX Preview Becomes Local Code Execution

**What goes wrong:**  
Imported templates or user-edited LaTeX can execute shell commands, read local files, write unexpected files, call allowed helper binaries, or exploit unsafe current-directory behavior. Live preview turns every edit into repeated execution.

**Why it happens:**  
TeX is a powerful document programming environment, not just markup. TeX Live's own security notes advise care with untrusted input, fresh directories/chroot-style isolation, and awareness that TeX can write files. Web2C documents shell escapes, including unrestricted `--shell-escape` and restricted modes. Tectonic documents `--untrusted` specifically for disabling known-dangerous features.

**Consequences:**  
A resume template becomes a local attack vector. This is especially damaging for a privacy-preserving desktop app that handles full career history and API keys.

**Warning signs:**
- Preview runs `pdflatex`/`latexmk` in the user's project/profile directory.
- `--shell-escape` appears in compile commands.
- Compile output can write outside a temp build directory.
- The app compiles uploaded LaTeX templates without a trust prompt.
- Windows builds run with current-directory executables on `PATH`.

**Prevention strategy:**
- Compile in an isolated temporary build directory with only the files needed for that draft.
- Disable shell escape by default: `--no-shell-escape` for TeX Live/Web2C or `--untrusted` for Tectonic.
- Do not support arbitrary template packages in v1 unless they work inside the safe compiler profile.
- Restrict file reads/writes to draft assets and build output; copy outputs back explicitly.
- Add compile timeouts, process cancellation, and output size limits.
- Treat uploaded templates as trusted-local only after the user explicitly confirms they understand the risk.

**Phase to address:**  
Phase 2 must implement the safe compiler worker before live preview is demoed. Phase 6 should repeat security review for packaged binaries.

**Confidence:** HIGH

---

### Pitfall 6: Structured Editing and Raw LaTeX Drift Apart

**What goes wrong:**  
The user edits a bullet in raw LaTeX, then a structured edit or AI regeneration overwrites it. Or the user changes structured data, but the generated LaTeX no longer reflects it. Eventually no one knows whether the database or the `.tex` file is authoritative.

**Why it happens:**  
ResumeLab deliberately supports two editing models: canonical structured facts and direct source control. Without an explicit artifact model, the app will oscillate between "generate everything" and "manual LaTeX is the source".

**Consequences:**  
Users lose edits, AI becomes scary to use, and future features like selective tailoring become hard to reason about.

**Warning signs:**
- There is a single "regenerate resume" action that replaces the whole `.tex` file.
- Raw edits are not represented in a draft history or diff.
- Generated sections have no stable anchors back to profile facts.
- Structured controls try to parse arbitrary LaTeX as the main sync mechanism.
- "Fix later" comments appear around merge behavior.

**Prevention strategy:**
- Model the profile as canonical facts and each resume as a versioned artifact.
- Generate LaTeX with stable section/item anchors linked to profile IDs.
- Treat raw LaTeX edits as draft-specific patches unless explicitly promoted to profile facts.
- Prefer selected-section regeneration over whole-document regeneration.
- Show diffs before applying AI or structured changes to existing LaTeX.
- Preserve user-edited regions unless the user chooses to replace them.

**Phase to address:**  
Phase 1 defines the data/artifact split. Phase 2 implements anchors and draft history. Phase 3 uses those anchors for AI edits.

**Confidence:** HIGH

---

### Pitfall 7: DOCX Export Is Treated as a Free Side Effect of PDF/LaTeX

**What goes wrong:**  
PDF export works, but DOCX output has broken bullets, missing links, poor spacing, bad styles, incorrect margins, or layout that shifts in Word/LibreOffice. Users discover this only when an application portal asks for `.docx`.

**Why it happens:**  
LaTeX is naturally PDF-oriented. Pandoc and other converters can help, but Pandoc's DOCX behavior depends on reference documents and stylesheets; the contents of a reference DOCX are ignored while styles/properties are used. PDF-to-DOCX conversion is especially fragile.

**Consequences:**  
Export quality becomes a late rewrite. The app can look complete in screenshots while failing a real job application workflow.

**Warning signs:**
- DOCX is deferred until "after PDF is done".
- Export tests only check that a file exists.
- The pipeline converts rendered PDF to DOCX.
- There is no `reference.docx` or style contract.
- Nobody opens output in Microsoft Word and LibreOffice during validation.

**Prevention strategy:**
- Design a semantic resume document model that can render to LaTeX/PDF and DOCX separately.
- Build a DOCX proof early with the first template, not at the end.
- Use a controlled `reference.docx` for margins, paragraph styles, headings, bullets, and links.
- Maintain golden export fixtures and compare extracted text order.
- QA DOCX in Word, LibreOffice, and at least one text extraction path.

**Phase to address:**  
Phase 2 should produce a thin DOCX proof to validate the architecture. Phase 5 finishes export fidelity.

**Confidence:** HIGH

---

### Pitfall 8: ATS Compatibility Is Reduced to a Fake Score or Pretty Template

**What goes wrong:**  
The resume looks good as a PDF, but ATS parsers read sections in the wrong order, miss contact details in headers/footers, drop icons/tables/text boxes, or mangle multi-column layout. The app may also produce a misleading "ATS score" that users over-trust.

**Why it happens:**  
Resume tools often optimize for visual templates and keyword density. Public resume guidance is inconsistent, but current Department of Labor and university career guidance still emphasizes following employer format instructions and avoiding parser-hostile formatting.

**Consequences:**  
Users submit resumes that are visually polished but mechanically weak. Worse, the app may imply guarantees it cannot provide.

**Warning signs:**
- The v1 template uses sidebars, icons, tables, text boxes, or important header/footer content.
- "ATS friendly" is claimed without a plain-text extraction test.
- Keyword matching ignores whether claims are truthful.
- The app reports exact pass/fail scores without knowing the target ATS.
- PDF export is image-like or text selection order is wrong.

**Prevention strategy:**
- Offer an ATS-safe mode: single-column, standard section names, text-selectable PDF, and DOCX option.
- Add a "plain text readback" validation view after export.
- Check extracted contact details, job titles, employers, dates, skills, and section ordering.
- Frame keyword coverage as evidence, not a guaranteed ATS score.
- Follow employer-requested file format first; otherwise provide both clean PDF and DOCX.

**Phase to address:**  
Phase 5 owns ATS validation, but Phase 2 must avoid choosing a v1 template that blocks ATS-safe output.

**Confidence:** MEDIUM

---

### Pitfall 9: Desktop Security Is Relaxed to Make the Web UI Work

**What goes wrong:**  
The app loads remote content in a privileged renderer, exposes broad filesystem/shell APIs to the frontend, disables web security, uses permissive Tauri capabilities, or accepts IPC calls without validating the sender and scope.

**Why it happens:**  
Desktop web stacks make native power easy. Electron explicitly warns that JavaScript can access filesystem and shell capabilities, and Tauri documents that capabilities/scopes reduce frontend compromise impact only when configured tightly.

**Consequences:**  
An XSS, malicious job page, compromised dependency, or bad plugin can escalate into local file access, command execution, or key theft.

**Warning signs:**
- Electron config has `nodeIntegration: true`, disabled `contextIsolation`, disabled sandboxing, or `webSecurity: false`.
- Tauri capabilities include broad `fs`, `shell`, `process`, or wildcard window scopes.
- Remote job pages render in the same privileged webview as the app.
- IPC/native commands trust renderer-provided paths or provider names.
- Security warnings are suppressed instead of resolved.

**Prevention strategy:**
- Pick a desktop security baseline in Phase 0 and make it part of the definition of done.
- Do not render remote pages in the privileged app surface. Use isolated fetch/extract or an unprivileged viewer.
- In Tauri, keep capabilities window-specific and path-scoped; avoid wildcard remote access.
- In Electron, keep Node integration off for remote content, enable context isolation/sandboxing, and validate IPC sender.
- Add security regression tests for disallowed file paths, command invocations, and remote origins.

**Phase to address:**  
Phase 0 sets the baseline. Phase 2 and Phase 4 enforce it for preview and job ingestion. Phase 6 audits packaging.

**Confidence:** HIGH

---

### Pitfall 10: Local Profile Data Has No Migration, Backup, or Recovery Story

**What goes wrong:**  
The app starts with JSON blobs or ad hoc SQLite tables, then later schema changes corrupt or lose user career history. Backups copy only a `.db` file while WAL data is active. Users cannot export or recover their profile if a migration fails.

**Why it happens:**  
Single-user desktop storage feels simple until the app evolves. SQLite's WAL and locking behavior are well documented, including corruption risks from filesystem locking problems and the need for proper backup mechanisms.

**Consequences:**  
Data loss in this product is severe: the profile database is the user's career memory and the source of truth for truthful tailoring.

**Warning signs:**
- No schema version table or `PRAGMA user_version` use.
- Migrations are manual code branches instead of ordered migration files.
- Backup means "copy the database file".
- No pre-migration snapshot exists.
- Import/export is deferred indefinitely.

**Prevention strategy:**
- Use an explicit schema version and ordered migrations from the first persistent release.
- Take an automatic snapshot before every migration.
- Use SQLite's backup API or `VACUUM INTO` for live backups, not raw file copy.
- Keep a portable JSON export/import of the canonical profile.
- Run `PRAGMA integrity_check` or equivalent validation on backup/restore tests.
- Store generated resumes separately from canonical profile facts.

**Phase to address:**  
Phase 1 must include migrations, backup, restore, and portable export before AI-generated drafts depend on the profile.

**Confidence:** HIGH

---

## Moderate Pitfalls

### Pitfall 11: Provider Abstraction Assumes All AI APIs Behave the Same

**What goes wrong:**  
OpenAI, Anthropic, Google, and OpenRouter-style providers differ in structured output support, schema subsets, streaming behavior, token accounting, refusal formats, rate limits, and model capability metadata.

**Warning signs:**  
Provider-specific conditionals spread through UI components; unsupported models are selectable for structured tasks; the app parses prose responses with regex; retries hide provider errors.

**Prevention strategy:**  
Create a provider capability registry and typed adapter layer. Use structured outputs where supported, validate with a local schema validator, and expose model compatibility in the UI. Keep provider integration tests with recorded fake responses and live smoke tests gated by user keys.

**Phase to address:**  
Phase 3

**Confidence:** HIGH

---

### Pitfall 12: Job Link Scraping Becomes the Product

**What goes wrong:**  
The team spends early roadmap time fighting dynamic job boards, anti-bot systems, login walls, CAPTCHAs, cookie/session handling, and brittle HTML selectors instead of building tailoring quality.

**Warning signs:**  
The paste box is treated as a fallback instead of the primary path; scraping requires user browser cookies; failures show stack traces; roadmap phases depend on scraping reliability.

**Prevention strategy:**  
Make manual paste the v1 table-stakes ingestion path. Optional link fetching should only retrieve public pages, show extracted text for user review, and degrade immediately to paste. Never scrape authenticated job portals in v1.

**Phase to address:**  
Phase 4

**Confidence:** HIGH

---

### Pitfall 13: Live Preview Feels Like Overleaf in Mockups but Not in Use

**What goes wrong:**  
Preview blocks typing, compiles every keystroke, shows stale PDFs, loses scroll position, hides compiler errors, or leaves orphan compile processes.

**Warning signs:**  
The renderer starts compiler processes directly; preview has no debounce/cancel queue; compile logs are not mapped to source lines; typing pauses longer than a few hundred milliseconds on normal resumes.

**Prevention strategy:**  
Run preview through a background compiler worker with debounce, cancellation, timeouts, and a single latest-build queue. Keep source-to-PDF position mapping as a separate enhancement, but show actionable compiler diagnostics from the start.

**Phase to address:**  
Phase 2

**Confidence:** HIGH

---

### Pitfall 14: Resume Upload Becomes an Unreliable Import Promise

**What goes wrong:**  
Users expect uploaded resumes to become perfect structured profile data, but parsing PDFs/DOCX into canonical facts is lossy. The product then has to reconcile imported facts, formatting, style, and truth.

**Warning signs:**  
Upload is described as "import your resume" rather than "style/reference context"; parsed facts are auto-written to the profile; errors are hidden; current resume upload blocks first-use onboarding.

**Prevention strategy:**  
Keep v1 upload as optional style and structure context. Any extracted facts must land in a review queue with source snippets, confidence, and explicit user approval before joining the profile database.

**Phase to address:**  
Phase 4

**Confidence:** HIGH

---

### Pitfall 15: AI Cost and Rate Limits Are Invisible

**What goes wrong:**  
User-provided keys can incur unexpected provider cost because retries, long profile context, multi-provider experiments, or streaming regenerations are hidden.

**Warning signs:**  
No token estimate before long calls; retry loops have no cap; users cannot cancel; provider rate-limit errors are presented as generic failures; every tailoring request sends the full profile.

**Prevention strategy:**  
Add token budgeting, context selection, cancellation, bounded retries, and provider-specific rate-limit handling. Show approximate request size and selected context before expensive calls.

**Phase to address:**  
Phase 3

**Confidence:** MEDIUM

---

### Pitfall 16: Template Licensing and TeX Dependencies Are Ignored

**What goes wrong:**  
The repo accidentally ships a personal/proprietary resume template, unlicensed fonts, or a TeX dependency set that works only on the developer's machine. Users cannot build PDFs after install.

**Warning signs:**  
Template files have no license header; docs say "install TeX somehow"; CI does not compile the starter template; fonts are copied from a local system; package size decisions are deferred.

**Prevention strategy:**  
Use a clearly licensed starter template and fonts. Add a first-run dependency check. Decide whether v1 uses an external TeX install, bundled engine, or Tectonic-style cached bundle. Compile the starter template in CI on all target OSes.

**Phase to address:**  
Phase 2 for template choice; Phase 6 for packaged distribution.

**Confidence:** MEDIUM

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store profile as one JSON blob | Fast prototype | Painful migrations, weak provenance, hard search/reuse | Only before first persistent user data |
| Let AI return final LaTeX only | Fast demo | No fact validation, no section diff, hard DOCX export | Never for core tailoring |
| Use regex to parse model prose | Quick provider demo | Breaks across models and languages | Only throwaway spikes |
| Compile LaTeX in app working directory | Easy file paths | File leakage, stale aux files, unsafe writes | Never |
| Defer DOCX until the end | Focus on PDF first | Export architecture rewrite | Never beyond Phase 2 proof |
| Broad desktop permissions | Unblocks local features | Large security blast radius | Only in local spike branches, not roadmap deliverables |
| Use one global prompt | Easy iteration | No evals, no versioning, hard regression detection | Acceptable only with prompt version logging |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI/Anthropic/Google/OpenRouter | Assuming equivalent structured output support | Capability registry, adapter tests, schema validation, user-visible compatibility |
| Provider keys | Storing in app settings or renderer state | Native/OS-backed secret storage; backend-only access; redacted logs |
| LaTeX engine | Enabling `--shell-escape` for template convenience | Safe compiler profile with shell escape disabled; isolated build directory |
| Pandoc/DOCX | Converting from PDF or relying on defaults | Semantic document model plus controlled `reference.docx` |
| Job URLs | Scraping authenticated/dynamic job boards | Manual paste first; optional public fetch with user review |
| SQLite | Copying live database files for backup | Backup API, `VACUUM INTO`, pre-migration snapshots |
| Desktop IPC | Trusting renderer-provided paths and commands | Allowlisted commands, scoped paths, sender/origin validation |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Compile on every keystroke | Laggy editor, CPU spikes, stale preview | Debounce, cancel previous build, worker process | Immediately on normal resumes |
| Send full profile to every AI call | Slow, expensive, privacy-hostile | Context selection and token budget | First large career profile |
| Store generated artifacts in profile rows | Slow profile operations, messy backups | Separate canonical profile from generated drafts | After several job-specific resumes |
| Re-render full PDF preview on every result | Flicker, scroll reset | Stable preview container, incremental state, scroll preservation | First edit loop |
| Provider retries without budget | Surprise API spend | Max retries, backoff, cancellation, clear error states | First provider outage/rate limit |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Sending raw full profile by default | Privacy breach through provider calls | Explicit context selection and preflight manifest |
| Letting LLM output drive filesystem/export paths | Path traversal or overwrite | Deterministic app-generated paths and validation |
| Rendering remote job pages in privileged desktop UI | XSS to native privilege escalation | Isolated fetch or unprivileged viewer |
| Keeping secrets in localStorage/SQLite/logs | API key theft | OS-backed secret storage and log redaction |
| Compiling untrusted LaTeX with shell escape | Local code execution | `--no-shell-escape` / `--untrusted`, isolated workdir |
| Broad Tauri/Electron IPC | Local privilege abuse | Narrow commands, scoped permissions, sender validation |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| AI changes are invisible | User cannot trust output | Show diff, source facts, and unsupported suggestions |
| Privacy is hidden behind settings | User does not know what leaves the machine | Preflight "data to send" review on every AI workflow |
| Errors say "generation failed" | User cannot fix provider/template issues | Separate provider, schema, validation, and LaTeX compiler errors |
| Raw LaTeX edits get overwritten | User stops using AI features | Draft history, section anchors, selective regeneration |
| ATS claims are overconfident | User trusts a false guarantee | Plain-text readback and cautious compatibility language |
| Current resume upload feels mandatory | Onboarding stalls | Make structured profile entry and paste flow work without upload |

## "Looks Done But Isn't" Checklist

- [ ] **AI tailoring:** Every resume claim maps to profile facts or user-approved custom text.
- [ ] **AI suggestions:** Unsupported additions are shown separately and cannot be committed without user action.
- [ ] **Provider keys:** Fake keys do not appear in persisted files, logs, renderer storage, or prompt transcripts.
- [ ] **Privacy:** Profile editing, LaTeX preview, PDF export, DOCX export, and profile search work with network disabled.
- [ ] **Prompt injection:** Adversarial job descriptions cannot change system instructions, access secrets, or bypass fact validation.
- [ ] **LaTeX preview:** Shell escape is disabled, compiles run in isolated temp dirs, and build processes are cancellable.
- [ ] **Raw/structured sync:** Regeneration preserves user-edited LaTeX unless the user approves a diff.
- [ ] **DOCX export:** Output opens correctly in Word and LibreOffice and preserves bullets, links, headings, dates, and margins.
- [ ] **ATS validation:** Exported PDF/DOCX has correct plain-text read order and visible contact details.
- [ ] **Backups:** Restore from backup is tested after WAL-mode writes and after a schema migration.
- [ ] **Packaging:** A clean machine can install the app, configure a provider, compile the starter template, and export PDF/DOCX.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AI factual drift already shipped | HIGH | Freeze AI writes, add provenance schema, backfill drafts as unverified, require user review before reuse |
| Plaintext keys persisted | HIGH | Rotate affected keys, add migration to delete raw keys, implement secret storage, scan logs/configs |
| Unsafe LaTeX compile path | HIGH | Disable preview, remove shell escape, isolate builds, add adversarial template tests |
| Structured/LaTeX drift | MEDIUM-HIGH | Introduce artifact versioning, anchors, and diff-based regeneration; preserve existing drafts as manual artifacts |
| DOCX export poor | MEDIUM | Add semantic document model and reference DOCX; stop claiming DOCX fidelity until validated |
| Bad SQLite migration | HIGH | Restore pre-migration snapshot, add migration tests, implement backup API and integrity checks |
| Overbuilt scraper | MEDIUM | Cut authenticated scraping, ship paste-first flow, keep URL extraction optional |
| Overbroad desktop permissions | MEDIUM-HIGH | Audit all native commands, narrow scopes, isolate remote content, add IPC validation tests |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI invents or mutates facts | Phase 0, Phase 3 | Generated bullets include source IDs; unsupported claims blocked |
| Prompt injection from job/resume inputs | Phase 0, Phase 4 | Adversarial fixtures fail safely and cannot access sinks |
| Local-first privacy leakage | Phase 0, Phase 1, Phase 3 | Network-offline tests pass; AI preflight manifest shown |
| API keys stored as preferences | Phase 1, Phase 6 | Fake key scan finds no persisted plaintext/log leaks |
| LaTeX as code execution | Phase 2, Phase 6 | Compile command disables shell escape; isolated temp workdir test passes |
| Structured/raw LaTeX drift | Phase 1, Phase 2, Phase 3 | Section regeneration preserves manual edits unless diff approved |
| DOCX treated as free export | Phase 2, Phase 5 | DOCX golden files pass visual/text checks |
| ATS reduced to fake score | Phase 2, Phase 5 | Plain-text readback validates order/contact/sections |
| Desktop permissions relaxed | Phase 0, Phase 2, Phase 4, Phase 6 | Security checklist and IPC/path scope tests pass |
| Local data without migration/backup | Phase 1 | Backup/restore/migration tests pass on active database |
| Provider abstraction mismatch | Phase 3 | Provider adapter test matrix passes |
| Scraper tarpit | Phase 4 | Paste path works without URL fetch; public fetch failures degrade cleanly |
| Preview loop jank | Phase 2 | Keystroke latency and cancellation tests pass |
| Resume upload import promise | Phase 4 | Extracted facts require review before profile write |
| Invisible AI cost/rate limits | Phase 3 | Token estimate, max retries, cancellation, rate-limit states verified |
| Template/dependency licensing | Phase 2, Phase 6 | Template/font licenses documented; clean-machine compile passes |

## Sources

- Project context: `.planning/PROJECT.md` - HIGH confidence for product constraints and out-of-scope boundaries.
- OpenAI, "Why language models hallucinate" - https://openai.com/index/why-language-models-hallucinate/ - HIGH confidence for hallucination/factuality risk.
- OpenAI, "Understanding prompt injections" - https://openai.com/safety/prompt-injections/ - HIGH confidence for prompt injection threat model and user controls.
- OpenAI API docs, "Safety in building agents" - https://developers.openai.com/api/docs/guides/agent-builder-safety - HIGH confidence for untrusted data and agent workflow risks.
- OpenAI, "Designing AI agents to resist prompt injection" - https://openai.com/index/designing-agents-to-resist-prompt-injection/ - HIGH confidence for source/sink framing and constraining impact.
- OWASP Top 10 for Large Language Model Applications - https://owasp.org/www-project-top-10-for-large-language-model-applications/ - HIGH confidence for LLM security categories.
- Tauri Security - https://v2.tauri.app/security/ - HIGH confidence for desktop trust-boundary guidance.
- Tauri Capabilities - https://v2.tauri.app/security/capabilities/ - HIGH confidence for permissions/capabilities risks.
- Tauri Stronghold API - https://v2.tauri.app/reference/javascript/stronghold/ - MEDIUM confidence for secret storage option; exact choice depends on final desktop stack.
- Electron Security Tutorial - https://www.electronjs.org/docs/latest/tutorial/security/ - HIGH confidence if Electron is selected.
- Electron safeStorage - https://www.electronjs.org/docs/latest/api/safe-storage - HIGH confidence if Electron is selected; Linux fallback needs validation.
- TeX Live Guide 2026 - https://tug.org/texlive/doc/texlive-en/texlive-en.pdf - HIGH confidence for TeX Live security considerations.
- Web2C shell escapes documentation - https://tug.org/texinfohtml/web2c.html - HIGH confidence for shell-escape behavior.
- Tectonic compile security docs - https://tectonic-typesetting.github.io/book/latest/v2cli/compile.html - HIGH confidence if Tectonic is selected.
- Pandoc User's Guide - https://pandoc.org/MANUAL.html - HIGH confidence for DOCX reference document behavior.
- SQLite WAL documentation - https://www.sqlite.org/wal.html - HIGH confidence for WAL behavior and version caveats.
- SQLite corruption guidance - https://www.sqlite.org/howtocorrupt.html - HIGH confidence for locking/filesystem corruption risks.
- SQLite Backup API - https://sqlite.org/backup.html - HIGH confidence for backup strategy.
- SQLite PRAGMA docs - https://www.sqlite.org/pragma.html - HIGH confidence for `user_version` and database metadata.
- U.S. Department of Labor VETS resume materials - https://www.dol.gov/sites/dolgov/files/VETS/files/DOL_EW_ParticipantGuide_6.0_Update1-March2026.pdf - MEDIUM confidence for file format guidance; employer instructions still override.
- Bellevue University Career Services ATS guide - https://www.bellevue.edu/student-support/career-services/PDFs/navigating-applicant-tracking-systems.pdf - MEDIUM confidence for ATS formatting warnings; ATS behavior varies by vendor.

---

*Pitfalls research for: ResumeLab local-first AI resume editor*  
*Researched: 2026-05-14*
