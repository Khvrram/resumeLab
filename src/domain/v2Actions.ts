import {
  analyzeJobText,
  scoreTextAgainstTarget,
  type TextMatchScore,
} from "./textSignals";
import type {
  JobApplication,
  JobApplicationSignalReview,
  JobApplicationStatus,
  LocalModelEndpoint,
  LocalModelProviderKind,
  LocalModelReadinessStatus,
  PromptProfile,
  PromptProfilePurpose,
  RemotePolicy,
  TemplateDefinition,
  TemplateGalleryCategory,
} from "./v2";

type CreateTemplateInput = {
  name?: string;
  description?: string;
  galleryCategory?: TemplateGalleryCategory;
  tags?: string[];
};

type CreateJobInput = {
  roleTitle?: string;
  company?: string;
  location?: string;
  remotePolicy?: RemotePolicy;
  sourceUrl?: string;
  jobDescription?: string;
  notes?: string;
};

type CreatePromptProfileInput = {
  name?: string;
  description?: string;
  purpose?: PromptProfilePurpose;
};

type CreateLocalModelEndpointInput = {
  label?: string;
  providerKind?: LocalModelProviderKind;
  baseUrl?: string;
  model?: string;
};

export type PromptPreviewInput = {
  promptProfile: PromptProfile;
  job: JobApplication;
  resumeText: string;
  selectedFacts?: string[];
};

export type PromptPreview = {
  systemPrompt: string;
  userPrompt: string;
  contextSummary: string[];
};

export type LocalModelCheckResult = {
  readiness: LocalModelReadinessStatus;
  checkedAt: string;
  failureMessage: string | null;
};

export function createTemplateDefinition(
  input: CreateTemplateInput = {},
): TemplateDefinition {
  const timestamp = new Date().toISOString();
  const normalizedName = input.name?.trim() || "Custom ATS Template";

  return {
    id: createV2Id("template"),
    createdAt: timestamp,
    updatedAt: timestamp,
    name: normalizedName,
    description:
      input.description?.trim() ||
      "Custom LaTeX resume template with guided section placeholders.",
    source: "custom",
    format: "latex",
    galleryCategory: input.galleryCategory ?? "ats",
    tags: input.tags ?? ["custom", "latex"],
    previewImagePath: null,
    latexEntrypointPath: null,
    mapping: [
      { resumeSection: "basics", templatePlaceholder: "PROFILE_HEADER", required: true },
      { resumeSection: "summary", templatePlaceholder: "SUMMARY_BLOCK", required: false },
      { resumeSection: "work", templatePlaceholder: "EXPERIENCE_ITEMS", required: true },
      { resumeSection: "skills", templatePlaceholder: "SKILL_GROUPS", required: true },
    ],
    styleControls: {
      colorPalettes: [
        {
          id: createV2Id("palette"),
          label: "Monochrome",
          accentColor: "#111827",
          textColor: "#111827",
          pageColor: "#ffffff",
        },
      ],
      fontFamilies: [
        {
          id: createV2Id("font"),
          label: "System Serif",
          headingFont: "System",
          bodyFont: "System",
          monoFont: "Monospace",
        },
      ],
      spacingPresets: [
        {
          id: createV2Id("spacing"),
          label: "Compact",
          lineHeight: 1.08,
          sectionGapPt: 7,
          pageMarginIn: 0.65,
        },
      ],
      sectionStyleOptions: [
        {
          id: createV2Id("section_style"),
          label: "Rule headings",
          description: "Uppercase section headings with simple horizontal rules.",
        },
      ],
    },
    importGuide: {
      supportsGuidedMapping: true,
      requiredPlaceholders: ["PROFILE_HEADER", "EXPERIENCE_ITEMS", "SKILL_GROUPS"],
      notes: "Map these placeholders before using the template for generation.",
    },
  };
}

export function duplicateTemplateDefinition(
  template: TemplateDefinition,
): TemplateDefinition {
  const timestamp = new Date().toISOString();

  return {
    ...template,
    id: createV2Id("template"),
    name: `${template.name} Copy`,
    source: "custom",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createJobApplication(input: CreateJobInput = {}): JobApplication {
  const timestamp = new Date().toISOString();
  const jobDescription = input.jobDescription?.trim() ?? "";
  const signalReview = createSignalReview(jobDescription, timestamp);

  return {
    id: createV2Id("job"),
    createdAt: timestamp,
    updatedAt: timestamp,
    roleTitle: input.roleTitle?.trim() || "Untitled role",
    company: input.company?.trim() || "Unknown company",
    location: input.location?.trim() || "",
    remotePolicy: input.remotePolicy ?? "unknown",
    status: "saved",
    source: {
      kind: "manual",
      url: input.sourceUrl?.trim() || null,
      capturedAt: timestamp,
    },
    jobDescription,
    compensation: null,
    contactName: null,
    contactEmail: null,
    notes: input.notes?.trim() || "",
    signalReview,
    artifacts: {
      resumeDraftIds: [],
      coverLetterDraftIds: [],
      comparisonRunIds: [],
    },
    statusHistory: [
      {
        status: "saved",
        at: timestamp,
        note: "Created manually in the local job tracker.",
      },
    ],
  };
}

export function refreshJobApplicationSignals(job: JobApplication): JobApplication {
  const timestamp = new Date().toISOString();

  return {
    ...job,
    updatedAt: timestamp,
    signalReview: createSignalReview(job.jobDescription, timestamp),
  };
}

export function updateJobApplicationStatus(
  job: JobApplication,
  status: JobApplicationStatus,
  note = "",
): JobApplication {
  const timestamp = new Date().toISOString();

  return {
    ...job,
    status,
    updatedAt: timestamp,
    statusHistory: [
      ...job.statusHistory,
      {
        status,
        at: timestamp,
        note: note.trim() || `Marked as ${status}.`,
      },
    ],
  };
}

export function scoreJobAgainstResumeText(
  job: JobApplication,
  resumeText: string,
): TextMatchScore {
  return scoreTextAgainstTarget(resumeText, job.jobDescription);
}

export function createPromptProfile(
  input: CreatePromptProfileInput = {},
): PromptProfile {
  const timestamp = new Date().toISOString();
  const purpose = input.purpose ?? "resume-tailoring";

  return {
    id: createV2Id("prompt_profile"),
    createdAt: timestamp,
    updatedAt: timestamp,
    name: input.name?.trim() || "Truth-preserving tailoring",
    description:
      input.description?.trim() ||
      "Select, rephrase, and order approved facts for one target job.",
    purpose,
    systemPrompt:
      "Use only approved source facts. Do not invent employers, tools, metrics, credentials, or dates.",
    userPromptTemplate:
      "Job: {{roleTitle}} at {{company}}\n\nRequirements:\n{{requirements}}\n\nResume facts:\n{{resumeText}}\n\nReturn proposed edits and unsupported suggestions separately.",
    allowedOperations:
      purpose === "cover-letter"
        ? ["select-existing-facts", "draft-cover-letter"]
        : [
            "select-existing-facts",
            "rephrase-existing-facts",
            "reorder-sections",
            "emphasize-keywords",
          ],
    requiresContextApproval: true,
    preferredProviderModels: [],
    localModelEndpointIds: [],
    createdForTemplateIds: [],
    tags: [purpose],
    isDefault: false,
  };
}

export function duplicatePromptProfile(prompt: PromptProfile): PromptProfile {
  const timestamp = new Date().toISOString();

  return {
    ...prompt,
    id: createV2Id("prompt_profile"),
    name: `${prompt.name} Copy`,
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renderPromptPreview(input: PromptPreviewInput): PromptPreview {
  const requirements =
    input.job.signalReview.requirements.length > 0
      ? input.job.signalReview.requirements.join("\n")
      : analyzeJobText(input.job.jobDescription).requirements.join("\n");
  const selectedFacts =
    input.selectedFacts && input.selectedFacts.length > 0
      ? input.selectedFacts.join("\n")
      : input.resumeText;
  const replacements: Record<string, string> = {
    company: input.job.company,
    jobDescription: input.job.jobDescription,
    keywords: input.job.signalReview.keywords.join(", "),
    requirements,
    resumeText: selectedFacts,
    roleTitle: input.job.roleTitle,
  };

  return {
    systemPrompt: input.promptProfile.systemPrompt,
    userPrompt: applyPromptTemplate(
      input.promptProfile.userPromptTemplate,
      replacements,
    ),
    contextSummary: [
      `${input.job.roleTitle} at ${input.job.company}`,
      `${input.job.signalReview.keywords.length} reviewed keywords`,
      `${selectedFacts.length} approved context characters`,
      input.promptProfile.requiresContextApproval
        ? "Context approval required before provider call"
        : "Context approval not required by this prompt profile",
    ],
  };
}

export function createLocalModelEndpoint(
  input: CreateLocalModelEndpointInput = {},
): LocalModelEndpoint {
  const timestamp = new Date().toISOString();
  const providerKind = input.providerKind ?? "ollama";

  return {
    id: createV2Id("local_endpoint"),
    createdAt: timestamp,
    updatedAt: timestamp,
    label: input.label?.trim() || "Local model endpoint",
    providerKind,
    baseUrl:
      input.baseUrl?.trim() ||
      (providerKind === "ollama"
        ? "http://127.0.0.1:11434"
        : "http://127.0.0.1:1234/v1"),
    model: input.model?.trim() || "",
    readiness: "configured",
    contextWindowTokens: 4096,
    supportsStreaming: true,
    lastCheckedAt: null,
    failureMessage: null,
    defaultParameters: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 1200,
    },
  };
}

export async function checkLocalModelEndpoint(
  endpoint: LocalModelEndpoint,
  fetcher: typeof fetch = fetch,
): Promise<LocalModelCheckResult> {
  const checkedAt = new Date().toISOString();
  const url = getModelCheckUrl(endpoint);

  try {
    const response = await fetcher(url, { method: "GET" });

    if (!response.ok) {
      return {
        readiness: "error",
        checkedAt,
        failureMessage: `HTTP ${response.status} from ${url}`,
      };
    }

    return {
      readiness: "ready",
      checkedAt,
      failureMessage: null,
    };
  } catch (error) {
    return {
      readiness: "unreachable",
      checkedAt,
      failureMessage: error instanceof Error ? error.message : "Endpoint unreachable",
    };
  }
}

function createSignalReview(
  jobDescription: string,
  timestamp: string,
): JobApplicationSignalReview {
  const analysis = analyzeJobText(jobDescription);

  return {
    extractedAt: jobDescription.trim() ? timestamp : null,
    requirements: analysis.requirements,
    keywords: analysis.keywords,
    tools: analysis.tools,
    responsibilities: analysis.responsibilities,
    senioritySignals: analysis.senioritySignals,
    userReviewed: false,
  };
}

function applyPromptTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (value, [key, replacement]) =>
      value.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), replacement),
    template,
  );
}

function getModelCheckUrl(endpoint: LocalModelEndpoint): string {
  const baseUrl = endpoint.baseUrl.replace(/\/+$/, "");

  if (endpoint.providerKind === "ollama") {
    return `${baseUrl}/api/tags`;
  }

  if (
    endpoint.providerKind === "lm-studio" ||
    endpoint.providerKind === "openai-compatible"
  ) {
    return `${baseUrl}/models`;
  }

  return baseUrl;
}

function createV2Id(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
