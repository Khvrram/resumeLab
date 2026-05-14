export const V2_WORKSPACE_SCHEMA_VERSION = 1 as const;

export type ISODateString = string;

export interface TimestampedRecord {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type TemplateSource = "built-in" | "imported" | "custom";
export type TemplateFormat = "latex";
export type TemplateGalleryCategory =
  | "ats"
  | "technical"
  | "executive"
  | "academic"
  | "creative";
export type ResumeTemplateSection =
  | "basics"
  | "summary"
  | "work"
  | "projects"
  | "education"
  | "skills"
  | "optional";

export type JobApplicationStatus =
  | "saved"
  | "tailoring"
  | "applied"
  | "screening"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "archived";

export type JobApplicationSourceKind =
  | "manual"
  | "browser-extension"
  | "job-board"
  | "import";
export type RemotePolicy = "onsite" | "hybrid" | "remote" | "unknown";

export type ProviderReadinessStatus =
  | "not-configured"
  | "missing-secret"
  | "ready"
  | "rate-limited"
  | "error";
export type RemoteProviderKind =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter";
export type LocalModelProviderKind =
  | "ollama"
  | "lm-studio"
  | "openai-compatible"
  | "custom";
export type LocalModelReadinessStatus =
  | "not-configured"
  | "configured"
  | "checking"
  | "ready"
  | "unreachable"
  | "error";

export type PromptProfilePurpose =
  | "resume-tailoring"
  | "cover-letter"
  | "provider-comparison"
  | "grammar-tone-impact-review"
  | "fact-extraction-review";
export type PromptOperation =
  | "select-existing-facts"
  | "rephrase-existing-facts"
  | "reorder-sections"
  | "emphasize-keywords"
  | "draft-cover-letter"
  | "compare-provider-outputs"
  | "review-grammar-tone-impact"
  | "suggest-fact-imports";

export type SyncCloudStatus =
  | "local-only"
  | "opted-in-not-configured"
  | "configured";
export type ReadOnlyPreviewSharingStatus =
  | "disabled"
  | "not-configured"
  | "ready";

export interface TemplateSectionMapping {
  resumeSection: ResumeTemplateSection;
  templatePlaceholder: string;
  required: boolean;
}

export interface TemplateColorPalette {
  id: string;
  label: string;
  accentColor: string;
  textColor: string;
  pageColor: string;
}

export interface TemplateFontFamily {
  id: string;
  label: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
}

export interface TemplateSpacingPreset {
  id: string;
  label: string;
  lineHeight: number;
  sectionGapPt: number;
  pageMarginIn: number;
}

export interface TemplateSectionStyleOption {
  id: string;
  label: string;
  description: string;
}

export interface TemplateStyleControls {
  colorPalettes: TemplateColorPalette[];
  fontFamilies: TemplateFontFamily[];
  spacingPresets: TemplateSpacingPreset[];
  sectionStyleOptions: TemplateSectionStyleOption[];
}

export interface TemplateImportGuide {
  supportsGuidedMapping: boolean;
  requiredPlaceholders: string[];
  notes: string;
}

export interface TemplateDefinition extends TimestampedRecord {
  name: string;
  description: string;
  source: TemplateSource;
  format: TemplateFormat;
  galleryCategory: TemplateGalleryCategory;
  tags: string[];
  previewImagePath: string | null;
  latexEntrypointPath: string | null;
  mapping: TemplateSectionMapping[];
  styleControls: TemplateStyleControls;
  importGuide: TemplateImportGuide;
}

export interface JobApplicationSource {
  kind: JobApplicationSourceKind;
  url: string | null;
  capturedAt: ISODateString | null;
}

export interface JobApplicationSignalReview {
  extractedAt: ISODateString | null;
  requirements: string[];
  keywords: string[];
  tools: string[];
  responsibilities: string[];
  senioritySignals: string[];
  userReviewed: boolean;
}

export interface JobApplicationArtifacts {
  resumeDraftIds: string[];
  coverLetterDraftIds: string[];
  comparisonRunIds: string[];
}

export interface JobApplicationStatusEvent {
  status: JobApplicationStatus;
  at: ISODateString;
  note: string;
}

export interface JobApplication extends TimestampedRecord {
  roleTitle: string;
  company: string;
  location: string;
  remotePolicy: RemotePolicy;
  status: JobApplicationStatus;
  source: JobApplicationSource;
  jobDescription: string;
  compensation: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string;
  signalReview: JobApplicationSignalReview;
  artifacts: JobApplicationArtifacts;
  statusHistory: JobApplicationStatusEvent[];
}

export interface ProviderModelPreference {
  provider: RemoteProviderKind;
  model: string;
  readiness: ProviderReadinessStatus;
  isDefault: boolean;
}

export interface PromptProfile extends TimestampedRecord {
  name: string;
  description: string;
  purpose: PromptProfilePurpose;
  systemPrompt: string;
  userPromptTemplate: string;
  allowedOperations: PromptOperation[];
  requiresContextApproval: boolean;
  preferredProviderModels: ProviderModelPreference[];
  localModelEndpointIds: string[];
  createdForTemplateIds: string[];
  tags: string[];
  isDefault: boolean;
}

export interface LocalModelParameters {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
}

export interface LocalModelEndpoint extends TimestampedRecord {
  label: string;
  providerKind: LocalModelProviderKind;
  baseUrl: string;
  model: string;
  readiness: LocalModelReadinessStatus;
  contextWindowTokens: number;
  supportsStreaming: boolean;
  lastCheckedAt: ISODateString | null;
  failureMessage: string | null;
  defaultParameters: LocalModelParameters;
}

export interface V2SyncFoundation {
  cloudStatus: SyncCloudStatus;
  encryptedCloudSyncEnabled: boolean;
  collaboratorIds: string[];
  readOnlyPreviewSharingStatus: ReadOnlyPreviewSharingStatus;
  lastSyncAt: ISODateString | null;
}

export interface SyncTexNavigationState {
  enabled: boolean;
  lastSourceFile: string | null;
  lastPdfPage: number | null;
}

export interface QualityReviewState {
  grammarToneImpactScoringEnabled: boolean;
  preferredPromptProfileId: string | null;
}

export interface FactImportState {
  highConfidenceImportEnabled: boolean;
  confidenceThreshold: number;
  pendingReviewCount: number;
}

export interface V2AdvancedEditingFoundation {
  syncTexNavigation: SyncTexNavigationState;
  qualityReview: QualityReviewState;
  factImport: FactImportState;
}

export interface V2WorkspaceState extends TimestampedRecord {
  schemaVersion: typeof V2_WORKSPACE_SCHEMA_VERSION;
  templates: TemplateDefinition[];
  jobApplications: JobApplication[];
  promptProfiles: PromptProfile[];
  localModelEndpoints: LocalModelEndpoint[];
  sync: V2SyncFoundation;
  advancedEditing: V2AdvancedEditingFoundation;
}

const SAMPLE_TIMESTAMP = "2026-05-14T00:00:00.000Z";

export function createEmptyV2Workspace(
  timestamp: ISODateString = new Date().toISOString(),
): V2WorkspaceState {
  return {
    schemaVersion: V2_WORKSPACE_SCHEMA_VERSION,
    id: createId("v2_workspace"),
    createdAt: timestamp,
    updatedAt: timestamp,
    templates: [],
    jobApplications: [],
    promptProfiles: [],
    localModelEndpoints: [],
    sync: createDefaultSyncFoundation(),
    advancedEditing: createDefaultAdvancedEditingFoundation(),
  };
}

export function createSampleV2Workspace(): V2WorkspaceState {
  return {
    schemaVersion: V2_WORKSPACE_SCHEMA_VERSION,
    id: "v2_workspace_sample",
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    templates: [
      {
        id: "template_ats_classic_latex",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        name: "ATS Classic LaTeX",
        description:
          "A dense one-page resume layout optimized for parser-friendly section order and clear chronology.",
        source: "built-in",
        format: "latex",
        galleryCategory: "ats",
        tags: ["one-page", "ats", "latex", "compact"],
        previewImagePath: null,
        latexEntrypointPath: "builtin://templates/ats-classic/main.tex",
        mapping: [
          mapping("basics", "PROFILE_HEADER", true),
          mapping("summary", "SUMMARY_BLOCK", false),
          mapping("work", "EXPERIENCE_ITEMS", true),
          mapping("projects", "PROJECT_ITEMS", false),
          mapping("education", "EDUCATION_ITEMS", true),
          mapping("skills", "SKILL_GROUPS", true),
          mapping("optional", "OPTIONAL_SECTIONS", false),
        ],
        styleControls: {
          colorPalettes: [
            colorPalette(
              "classic_blue",
              "Classic Blue",
              "#2563eb",
              "#111827",
              "#ffffff",
            ),
            colorPalette(
              "mono_black",
              "Monochrome",
              "#111827",
              "#111827",
              "#ffffff",
            ),
          ],
          fontFamilies: [
            fontFamily(
              "source_serif_sans",
              "Source Serif and Sans",
              "Source Sans 3",
              "Source Serif 4",
              "JetBrains Mono",
            ),
          ],
          spacingPresets: [
            spacingPreset("compact", "Compact", 1.05, 6, 0.55),
            spacingPreset("balanced", "Balanced", 1.12, 8, 0.65),
          ],
          sectionStyleOptions: [
            sectionStyle(
              "rule_heading",
              "Rule headings",
              "Uppercase headings with a thin horizontal rule.",
            ),
          ],
        },
        importGuide: {
          supportsGuidedMapping: true,
          requiredPlaceholders: [
            "PROFILE_HEADER",
            "EXPERIENCE_ITEMS",
            "EDUCATION_ITEMS",
            "SKILL_GROUPS",
          ],
          notes:
            "Use as the baseline for imported LaTeX templates that expose clear section placeholders.",
        },
      },
      {
        id: "template_modern_technical",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        name: "Modern Technical",
        description:
          "A technical resume gallery option with stronger project emphasis and configurable accent color.",
        source: "built-in",
        format: "latex",
        galleryCategory: "technical",
        tags: ["engineering", "projects", "skills", "latex"],
        previewImagePath: null,
        latexEntrypointPath: "builtin://templates/modern-technical/main.tex",
        mapping: [
          mapping("basics", "CONTACT_HEADER", true),
          mapping("summary", "PROFILE_SUMMARY", false),
          mapping("skills", "TECHNICAL_SKILLS", true),
          mapping("work", "PROFESSIONAL_EXPERIENCE", true),
          mapping("projects", "SELECTED_PROJECTS", true),
          mapping("education", "EDUCATION", true),
          mapping("optional", "ADDITIONAL_SECTIONS", false),
        ],
        styleControls: {
          colorPalettes: [
            colorPalette(
              "technical_teal",
              "Technical Teal",
              "#0f766e",
              "#111827",
              "#ffffff",
            ),
            colorPalette(
              "technical_steel",
              "Steel",
              "#475569",
              "#0f172a",
              "#ffffff",
            ),
          ],
          fontFamilies: [
            fontFamily(
              "inter_source_code",
              "Inter and Source Code",
              "Inter",
              "Inter",
              "Source Code Pro",
            ),
          ],
          spacingPresets: [
            spacingPreset("project_dense", "Project dense", 1.08, 7, 0.6),
          ],
          sectionStyleOptions: [
            sectionStyle(
              "accent_label",
              "Accent labels",
              "Small accent labels for skills, tools, and project metadata.",
            ),
          ],
        },
        importGuide: {
          supportsGuidedMapping: true,
          requiredPlaceholders: [
            "CONTACT_HEADER",
            "TECHNICAL_SKILLS",
            "PROFESSIONAL_EXPERIENCE",
            "SELECTED_PROJECTS",
          ],
          notes:
            "Best for roles where projects and technical skills should appear above education.",
        },
      },
      {
        id: "template_executive_compact",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        name: "Executive Compact",
        description:
          "A compact leadership-oriented template with a stronger summary and achievement grouping.",
        source: "built-in",
        format: "latex",
        galleryCategory: "executive",
        tags: ["leadership", "summary", "achievements", "latex"],
        previewImagePath: null,
        latexEntrypointPath: "builtin://templates/executive-compact/main.tex",
        mapping: [
          mapping("basics", "EXECUTIVE_HEADER", true),
          mapping("summary", "LEADERSHIP_SUMMARY", true),
          mapping("work", "ROLE_HISTORY", true),
          mapping("skills", "CORE_COMPETENCIES", true),
          mapping("education", "EDUCATION", false),
          mapping("optional", "BOARD_AND_AWARDS", false),
        ],
        styleControls: {
          colorPalettes: [
            colorPalette(
              "executive_ink",
              "Executive Ink",
              "#334155",
              "#111827",
              "#ffffff",
            ),
          ],
          fontFamilies: [
            fontFamily(
              "libertinus_source_sans",
              "Libertinus and Source Sans",
              "Source Sans 3",
              "Libertinus Serif",
              "JetBrains Mono",
            ),
          ],
          spacingPresets: [
            spacingPreset("leadership_compact", "Leadership compact", 1.1, 7, 0.62),
          ],
          sectionStyleOptions: [
            sectionStyle(
              "small_caps",
              "Small caps",
              "Small-caps section headings with compact achievement spacing.",
            ),
          ],
        },
        importGuide: {
          supportsGuidedMapping: true,
          requiredPlaceholders: [
            "EXECUTIVE_HEADER",
            "LEADERSHIP_SUMMARY",
            "ROLE_HISTORY",
            "CORE_COMPETENCIES",
          ],
          notes:
            "Use for senior roles where evidence-backed leadership outcomes need to read first.",
        },
      },
    ],
    jobApplications: [
      {
        id: "job_civicforms_senior_product_engineer",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        roleTitle: "Senior Product Engineer",
        company: "CivicForms",
        location: "Remote, US",
        remotePolicy: "remote",
        status: "interviewing",
        source: {
          kind: "manual",
          url: "https://example.com/jobs/civicforms-senior-product-engineer",
          capturedAt: "2026-05-12T14:10:00.000Z",
        },
        jobDescription:
          "Build privacy-sensitive workflow tools with React, TypeScript, local data models, and careful user-review paths for generated content.",
        compensation: "$150k-$185k",
        contactName: "Sam Rivera",
        contactEmail: "sam.rivera@example.com",
        notes:
          "Strong match for local-first workflow experience. Emphasize offline queue, audit trail, and structured editing work.",
        signalReview: {
          extractedAt: "2026-05-12T14:20:00.000Z",
          requirements: [
            "5+ years building production web applications",
            "Experience with React and TypeScript",
            "Comfort designing local data models",
            "Clear product judgment for privacy-sensitive workflows",
          ],
          keywords: [
            "local-first",
            "privacy",
            "React",
            "TypeScript",
            "SQLite",
          ],
          tools: ["React", "TypeScript", "SQLite", "Electron"],
          responsibilities: [
            "Own product workflows from model design through UI polish",
            "Collaborate with design and support teams on user-visible review states",
          ],
          senioritySignals: [
            "Mentors engineers",
            "Leads ambiguous product initiatives",
          ],
          userReviewed: true,
        },
        artifacts: {
          resumeDraftIds: ["resume_draft_civicforms_v1"],
          coverLetterDraftIds: ["cover_letter_civicforms_v1"],
          comparisonRunIds: [],
        },
        statusHistory: [
          {
            status: "saved",
            at: "2026-05-12T14:10:00.000Z",
            note: "Captured from manual job link and pasted description.",
          },
          {
            status: "tailoring",
            at: "2026-05-12T15:00:00.000Z",
            note: "Created first tailored resume and cover letter drafts.",
          },
          {
            status: "applied",
            at: "2026-05-13T09:30:00.000Z",
            note: "Application submitted with tailored PDF.",
          },
          {
            status: "interviewing",
            at: "2026-05-14T10:45:00.000Z",
            note: "Recruiter screen scheduled.",
          },
        ],
      },
      {
        id: "job_northstar_frontend_platform",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        roleTitle: "Frontend Platform Engineer",
        company: "Northstar Labs",
        location: "New York, NY",
        remotePolicy: "hybrid",
        status: "saved",
        source: {
          kind: "browser-extension",
          url: "https://example.com/jobs/northstar-frontend-platform",
          capturedAt: "2026-05-14T13:00:00.000Z",
        },
        jobDescription:
          "Improve shared frontend systems, performance budgets, and design-system adoption for a data-heavy B2B product.",
        compensation: null,
        contactName: null,
        contactEmail: null,
        notes:
          "Needs a resume variant that foregrounds TypeScript migration and dashboard performance work.",
        signalReview: {
          extractedAt: null,
          requirements: [],
          keywords: ["frontend platform", "performance", "design systems"],
          tools: ["React", "TypeScript"],
          responsibilities: [],
          senioritySignals: [],
          userReviewed: false,
        },
        artifacts: {
          resumeDraftIds: [],
          coverLetterDraftIds: [],
          comparisonRunIds: [],
        },
        statusHistory: [
          {
            status: "saved",
            at: "2026-05-14T13:00:00.000Z",
            note: "Captured from browser extension foundation path.",
          },
        ],
      },
    ],
    promptProfiles: [
      {
        id: "prompt_profile_truthful_tailoring",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        name: "Truth-preserving resume tailoring",
        description:
          "Rephrase, select, and order approved profile facts for one job target without adding unsupported claims.",
        purpose: "resume-tailoring",
        systemPrompt:
          "You are a resume tailoring assistant. Use only approved source facts, preserve truth, and return unsupported ideas separately.",
        userPromptTemplate:
          "Tailor the selected profile facts to the job target. Return proposed resume edits with source fact IDs and a separate missing-facts list.",
        allowedOperations: [
          "select-existing-facts",
          "rephrase-existing-facts",
          "reorder-sections",
          "emphasize-keywords",
        ],
        requiresContextApproval: true,
        preferredProviderModels: [
          providerPreference(
            "openai",
            "configured-default",
            "missing-secret",
            true,
          ),
          providerPreference(
            "anthropic",
            "configured-default",
            "not-configured",
            false,
          ),
          providerPreference(
            "openrouter",
            "configured-default",
            "not-configured",
            false,
          ),
        ],
        localModelEndpointIds: ["local_endpoint_ollama"],
        createdForTemplateIds: ["template_ats_classic_latex"],
        tags: ["tailoring", "facts", "ats"],
        isDefault: true,
      },
      {
        id: "prompt_profile_cover_letter",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        name: "Evidence-backed cover letter",
        description:
          "Drafts a concise cover letter from selected profile facts and reviewed job requirements.",
        purpose: "cover-letter",
        systemPrompt:
          "You draft concise cover letters grounded in approved source facts and avoid unverifiable claims.",
        userPromptTemplate:
          "Create a cover letter draft for the job target using the selected facts. Keep it under 300 words and cite source fact IDs internally.",
        allowedOperations: ["select-existing-facts", "draft-cover-letter"],
        requiresContextApproval: true,
        preferredProviderModels: [
          providerPreference(
            "google",
            "configured-default",
            "not-configured",
            true,
          ),
        ],
        localModelEndpointIds: ["local_endpoint_lm_studio"],
        createdForTemplateIds: [],
        tags: ["cover-letter", "job-search"],
        isDefault: false,
      },
      {
        id: "prompt_profile_provider_comparison",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        name: "Provider comparison review",
        description:
          "Compares multiple provider outputs for the same job target and highlights factual-risk differences.",
        purpose: "provider-comparison",
        systemPrompt:
          "Compare provider outputs for factual grounding, relevance, tone, and user-review burden.",
        userPromptTemplate:
          "Compare these provider outputs against the selected facts and job target. Flag unsupported claims and rank the safest draft.",
        allowedOperations: ["compare-provider-outputs"],
        requiresContextApproval: true,
        preferredProviderModels: [
          providerPreference(
            "openai",
            "configured-default",
            "missing-secret",
            true,
          ),
          providerPreference(
            "anthropic",
            "configured-default",
            "not-configured",
            false,
          ),
        ],
        localModelEndpointIds: ["local_endpoint_ollama"],
        createdForTemplateIds: [],
        tags: ["comparison", "fact-governance"],
        isDefault: false,
      },
    ],
    localModelEndpoints: [
      {
        id: "local_endpoint_ollama",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        label: "Ollama on localhost",
        providerKind: "ollama",
        baseUrl: "http://127.0.0.1:11434",
        model: "llama3.1:8b",
        readiness: "configured",
        contextWindowTokens: 8192,
        supportsStreaming: true,
        lastCheckedAt: null,
        failureMessage: null,
        defaultParameters: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 1200,
        },
      },
      {
        id: "local_endpoint_lm_studio",
        createdAt: SAMPLE_TIMESTAMP,
        updatedAt: SAMPLE_TIMESTAMP,
        label: "LM Studio local server",
        providerKind: "lm-studio",
        baseUrl: "http://127.0.0.1:1234/v1",
        model: "local-resume-assistant",
        readiness: "not-configured",
        contextWindowTokens: 4096,
        supportsStreaming: true,
        lastCheckedAt: null,
        failureMessage: null,
        defaultParameters: {
          temperature: 0.15,
          topP: 0.85,
          maxOutputTokens: 1000,
        },
      },
    ],
    sync: createDefaultSyncFoundation(),
    advancedEditing: {
      syncTexNavigation: {
        enabled: false,
        lastSourceFile: null,
        lastPdfPage: null,
      },
      qualityReview: {
        grammarToneImpactScoringEnabled: false,
        preferredPromptProfileId: "prompt_profile_truthful_tailoring",
      },
      factImport: {
        highConfidenceImportEnabled: false,
        confidenceThreshold: 0.85,
        pendingReviewCount: 0,
      },
    },
  };
}

export function isV2WorkspaceState(value: unknown): value is V2WorkspaceState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === V2_WORKSPACE_SCHEMA_VERSION &&
    isTimestampedRecord(value) &&
    isArrayOf(value.templates, isTemplateDefinition) &&
    isArrayOf(value.jobApplications, isJobApplication) &&
    isArrayOf(value.promptProfiles, isPromptProfile) &&
    isArrayOf(value.localModelEndpoints, isLocalModelEndpoint) &&
    isV2SyncFoundation(value.sync) &&
    isV2AdvancedEditingFoundation(value.advancedEditing)
  );
}

export function isJobApplicationStatus(
  value: unknown,
): value is JobApplicationStatus {
  return (
    value === "saved" ||
    value === "tailoring" ||
    value === "applied" ||
    value === "screening" ||
    value === "interviewing" ||
    value === "offer" ||
    value === "rejected" ||
    value === "withdrawn" ||
    value === "archived"
  );
}

export function isProviderReadinessStatus(
  value: unknown,
): value is ProviderReadinessStatus {
  return (
    value === "not-configured" ||
    value === "missing-secret" ||
    value === "ready" ||
    value === "rate-limited" ||
    value === "error"
  );
}

export function isLocalModelReadinessStatus(
  value: unknown,
): value is LocalModelReadinessStatus {
  return (
    value === "not-configured" ||
    value === "configured" ||
    value === "checking" ||
    value === "ready" ||
    value === "unreachable" ||
    value === "error"
  );
}

function createDefaultSyncFoundation(): V2SyncFoundation {
  return {
    cloudStatus: "local-only",
    encryptedCloudSyncEnabled: false,
    collaboratorIds: [],
    readOnlyPreviewSharingStatus: "disabled",
    lastSyncAt: null,
  };
}

function createDefaultAdvancedEditingFoundation(): V2AdvancedEditingFoundation {
  return {
    syncTexNavigation: {
      enabled: false,
      lastSourceFile: null,
      lastPdfPage: null,
    },
    qualityReview: {
      grammarToneImpactScoringEnabled: false,
      preferredPromptProfileId: null,
    },
    factImport: {
      highConfidenceImportEnabled: false,
      confidenceThreshold: 0.85,
      pendingReviewCount: 0,
    },
  };
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapping(
  resumeSection: ResumeTemplateSection,
  templatePlaceholder: string,
  required: boolean,
): TemplateSectionMapping {
  return {
    resumeSection,
    templatePlaceholder,
    required,
  };
}

function colorPalette(
  id: string,
  label: string,
  accentColor: string,
  textColor: string,
  pageColor: string,
): TemplateColorPalette {
  return {
    id,
    label,
    accentColor,
    textColor,
    pageColor,
  };
}

function fontFamily(
  id: string,
  label: string,
  headingFont: string,
  bodyFont: string,
  monoFont: string,
): TemplateFontFamily {
  return {
    id,
    label,
    headingFont,
    bodyFont,
    monoFont,
  };
}

function spacingPreset(
  id: string,
  label: string,
  lineHeight: number,
  sectionGapPt: number,
  pageMarginIn: number,
): TemplateSpacingPreset {
  return {
    id,
    label,
    lineHeight,
    sectionGapPt,
    pageMarginIn,
  };
}

function sectionStyle(
  id: string,
  label: string,
  description: string,
): TemplateSectionStyleOption {
  return {
    id,
    label,
    description,
  };
}

function providerPreference(
  provider: RemoteProviderKind,
  model: string,
  readiness: ProviderReadinessStatus,
  isDefault: boolean,
): ProviderModelPreference {
  return {
    provider,
    model,
    readiness,
    isDefault,
  };
}

function isTemplateDefinition(value: unknown): value is TemplateDefinition {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.name) &&
    isString(value.description) &&
    isTemplateSource(value.source) &&
    value.format === "latex" &&
    isTemplateGalleryCategory(value.galleryCategory) &&
    isArrayOf(value.tags, isString) &&
    isNullableString(value.previewImagePath) &&
    isNullableString(value.latexEntrypointPath) &&
    isArrayOf(value.mapping, isTemplateSectionMapping) &&
    isTemplateStyleControls(value.styleControls) &&
    isTemplateImportGuide(value.importGuide)
  );
}

function isTemplateSectionMapping(
  value: unknown,
): value is TemplateSectionMapping {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isResumeTemplateSection(value.resumeSection) &&
    isString(value.templatePlaceholder) &&
    isBoolean(value.required)
  );
}

function isTemplateStyleControls(
  value: unknown,
): value is TemplateStyleControls {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isArrayOf(value.colorPalettes, isTemplateColorPalette) &&
    isArrayOf(value.fontFamilies, isTemplateFontFamily) &&
    isArrayOf(value.spacingPresets, isTemplateSpacingPreset) &&
    isArrayOf(value.sectionStyleOptions, isTemplateSectionStyleOption)
  );
}

function isTemplateColorPalette(
  value: unknown,
): value is TemplateColorPalette {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.accentColor) &&
    isString(value.textColor) &&
    isString(value.pageColor)
  );
}

function isTemplateFontFamily(value: unknown): value is TemplateFontFamily {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.headingFont) &&
    isString(value.bodyFont) &&
    isString(value.monoFont)
  );
}

function isTemplateSpacingPreset(
  value: unknown,
): value is TemplateSpacingPreset {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.label) &&
    isNumber(value.lineHeight) &&
    isNumber(value.sectionGapPt) &&
    isNumber(value.pageMarginIn)
  );
}

function isTemplateSectionStyleOption(
  value: unknown,
): value is TemplateSectionStyleOption {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.description)
  );
}

function isTemplateImportGuide(value: unknown): value is TemplateImportGuide {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoolean(value.supportsGuidedMapping) &&
    isArrayOf(value.requiredPlaceholders, isString) &&
    isString(value.notes)
  );
}

function isJobApplication(value: unknown): value is JobApplication {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.roleTitle) &&
    isString(value.company) &&
    isString(value.location) &&
    isRemotePolicy(value.remotePolicy) &&
    isJobApplicationStatus(value.status) &&
    isJobApplicationSource(value.source) &&
    isString(value.jobDescription) &&
    isNullableString(value.compensation) &&
    isNullableString(value.contactName) &&
    isNullableString(value.contactEmail) &&
    isString(value.notes) &&
    isJobApplicationSignalReview(value.signalReview) &&
    isJobApplicationArtifacts(value.artifacts) &&
    isArrayOf(value.statusHistory, isJobApplicationStatusEvent)
  );
}

function isJobApplicationSource(
  value: unknown,
): value is JobApplicationSource {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isJobApplicationSourceKind(value.kind) &&
    isNullableString(value.url) &&
    isNullableString(value.capturedAt)
  );
}

function isJobApplicationSignalReview(
  value: unknown,
): value is JobApplicationSignalReview {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNullableString(value.extractedAt) &&
    isArrayOf(value.requirements, isString) &&
    isArrayOf(value.keywords, isString) &&
    isArrayOf(value.tools, isString) &&
    isArrayOf(value.responsibilities, isString) &&
    isArrayOf(value.senioritySignals, isString) &&
    isBoolean(value.userReviewed)
  );
}

function isJobApplicationArtifacts(
  value: unknown,
): value is JobApplicationArtifacts {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isArrayOf(value.resumeDraftIds, isString) &&
    isArrayOf(value.coverLetterDraftIds, isString) &&
    isArrayOf(value.comparisonRunIds, isString)
  );
}

function isJobApplicationStatusEvent(
  value: unknown,
): value is JobApplicationStatusEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isJobApplicationStatus(value.status) &&
    isString(value.at) &&
    isString(value.note)
  );
}

function isPromptProfile(value: unknown): value is PromptProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.name) &&
    isString(value.description) &&
    isPromptProfilePurpose(value.purpose) &&
    isString(value.systemPrompt) &&
    isString(value.userPromptTemplate) &&
    isArrayOf(value.allowedOperations, isPromptOperation) &&
    isBoolean(value.requiresContextApproval) &&
    isArrayOf(value.preferredProviderModels, isProviderModelPreference) &&
    isArrayOf(value.localModelEndpointIds, isString) &&
    isArrayOf(value.createdForTemplateIds, isString) &&
    isArrayOf(value.tags, isString) &&
    isBoolean(value.isDefault)
  );
}

function isProviderModelPreference(
  value: unknown,
): value is ProviderModelPreference {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRemoteProviderKind(value.provider) &&
    isString(value.model) &&
    isProviderReadinessStatus(value.readiness) &&
    isBoolean(value.isDefault)
  );
}

function isLocalModelEndpoint(value: unknown): value is LocalModelEndpoint {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimestampedRecord(value) &&
    isString(value.label) &&
    isLocalModelProviderKind(value.providerKind) &&
    isString(value.baseUrl) &&
    isString(value.model) &&
    isLocalModelReadinessStatus(value.readiness) &&
    isNumber(value.contextWindowTokens) &&
    isBoolean(value.supportsStreaming) &&
    isNullableString(value.lastCheckedAt) &&
    isNullableString(value.failureMessage) &&
    isLocalModelParameters(value.defaultParameters)
  );
}

function isLocalModelParameters(
  value: unknown,
): value is LocalModelParameters {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.temperature) &&
    isNumber(value.topP) &&
    isNumber(value.maxOutputTokens)
  );
}

function isV2SyncFoundation(value: unknown): value is V2SyncFoundation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isSyncCloudStatus(value.cloudStatus) &&
    isBoolean(value.encryptedCloudSyncEnabled) &&
    isArrayOf(value.collaboratorIds, isString) &&
    isReadOnlyPreviewSharingStatus(value.readOnlyPreviewSharingStatus) &&
    isNullableString(value.lastSyncAt)
  );
}

function isV2AdvancedEditingFoundation(
  value: unknown,
): value is V2AdvancedEditingFoundation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isSyncTexNavigationState(value.syncTexNavigation) &&
    isQualityReviewState(value.qualityReview) &&
    isFactImportState(value.factImport)
  );
}

function isSyncTexNavigationState(
  value: unknown,
): value is SyncTexNavigationState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoolean(value.enabled) &&
    isNullableString(value.lastSourceFile) &&
    (isNumber(value.lastPdfPage) || value.lastPdfPage === null)
  );
}

function isQualityReviewState(value: unknown): value is QualityReviewState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoolean(value.grammarToneImpactScoringEnabled) &&
    isNullableString(value.preferredPromptProfileId)
  );
}

function isFactImportState(value: unknown): value is FactImportState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoolean(value.highConfidenceImportEnabled) &&
    isNumber(value.confidenceThreshold) &&
    isNumber(value.pendingReviewCount)
  );
}

function isTemplateSource(value: unknown): value is TemplateSource {
  return value === "built-in" || value === "imported" || value === "custom";
}

function isTemplateGalleryCategory(
  value: unknown,
): value is TemplateGalleryCategory {
  return (
    value === "ats" ||
    value === "technical" ||
    value === "executive" ||
    value === "academic" ||
    value === "creative"
  );
}

function isResumeTemplateSection(
  value: unknown,
): value is ResumeTemplateSection {
  return (
    value === "basics" ||
    value === "summary" ||
    value === "work" ||
    value === "projects" ||
    value === "education" ||
    value === "skills" ||
    value === "optional"
  );
}

function isRemotePolicy(value: unknown): value is RemotePolicy {
  return (
    value === "onsite" ||
    value === "hybrid" ||
    value === "remote" ||
    value === "unknown"
  );
}

function isJobApplicationSourceKind(
  value: unknown,
): value is JobApplicationSourceKind {
  return (
    value === "manual" ||
    value === "browser-extension" ||
    value === "job-board" ||
    value === "import"
  );
}

function isRemoteProviderKind(value: unknown): value is RemoteProviderKind {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "google" ||
    value === "openrouter"
  );
}

function isLocalModelProviderKind(
  value: unknown,
): value is LocalModelProviderKind {
  return (
    value === "ollama" ||
    value === "lm-studio" ||
    value === "openai-compatible" ||
    value === "custom"
  );
}

function isPromptProfilePurpose(
  value: unknown,
): value is PromptProfilePurpose {
  return (
    value === "resume-tailoring" ||
    value === "cover-letter" ||
    value === "provider-comparison" ||
    value === "grammar-tone-impact-review" ||
    value === "fact-extraction-review"
  );
}

function isPromptOperation(value: unknown): value is PromptOperation {
  return (
    value === "select-existing-facts" ||
    value === "rephrase-existing-facts" ||
    value === "reorder-sections" ||
    value === "emphasize-keywords" ||
    value === "draft-cover-letter" ||
    value === "compare-provider-outputs" ||
    value === "review-grammar-tone-impact" ||
    value === "suggest-fact-imports"
  );
}

function isSyncCloudStatus(value: unknown): value is SyncCloudStatus {
  return (
    value === "local-only" ||
    value === "opted-in-not-configured" ||
    value === "configured"
  );
}

function isReadOnlyPreviewSharingStatus(
  value: unknown,
): value is ReadOnlyPreviewSharingStatus {
  return (
    value === "disabled" ||
    value === "not-configured" ||
    value === "ready"
  );
}

function isTimestampedRecord(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isArrayOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(predicate);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return isString(value) || value === null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
