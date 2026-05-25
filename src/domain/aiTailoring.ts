import type { JobApplication, RemoteProviderKind } from "./v2";

export type AiProviderConfig = {
  id: string;
  createdAt: string;
  updatedAt: string;
  provider: RemoteProviderKind;
  label: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  hasSecret: boolean;
};

export type AiTailoringPrompt = {
  systemPrompt: string;
  userPrompt: string;
  egressPreview: string;
};

export type AiTailoringProviderResponse = {
  outputText: string;
  providerRequestId?: string | null;
  usage?: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
  } | null;
};

export type AiProposalChange = {
  section: string;
  before: string;
  after: string;
  rationale: string;
};

export type AiTailoringProposal = {
  id: string;
  createdAt: string;
  provider: RemoteProviderKind;
  model: string;
  providerRequestId: string | null;
  jobLabel: string;
  revisedText: string;
  changes: AiProposalChange[];
  suggestedAdditions: string[];
  unsupportedLines: string[];
  rawProviderText: string;
  usage: AiTailoringProviderResponse["usage"];
};

export type ParsedTailoringResponse = {
  revisedResumeText: string;
  changes: AiProposalChange[];
  suggestedAdditions: string[];
};

export function createDefaultAiProviderConfigs(
  timestamp = new Date().toISOString(),
): AiProviderConfig[] {
  return [
    providerConfig("openai", "OpenAI", "gpt-4.1-mini", "https://api.openai.com/v1", timestamp),
    providerConfig("anthropic", "Anthropic", "claude-3-5-sonnet-latest", "https://api.anthropic.com", timestamp),
    providerConfig("google", "Google Gemini", "gemini-1.5-pro", "https://generativelanguage.googleapis.com/v1beta", timestamp),
    providerConfig("openrouter", "OpenRouter", "openai/gpt-4o-mini", "https://openrouter.ai/api/v1", timestamp),
  ];
}

export function buildTailoringPrompt({
  job,
  resumeText,
}: {
  job: JobApplication;
  resumeText: string;
}): AiTailoringPrompt {
  const jobLabel = formatJobLabel(job);
  const systemPrompt = [
    "You are ResumeLab's truth-preserving resume tailoring assistant.",
    "Use only the approved resume facts supplied by the user.",
    "Do not invent employers, titles, dates, degrees, tools, credentials, metrics, locations, or accomplishments.",
    "If a useful fact is missing, put it in suggestedAdditions instead of adding it to revisedResumeText.",
    "Return strict JSON only.",
  ].join(" ");
  const userPrompt = JSON.stringify(
    {
      task:
        "Tailor the resume text for the target job by rephrasing, ordering, and emphasizing existing truthful facts.",
      outputSchema: {
        revisedResumeText: "string",
        changes: [
          {
            section: "string",
            before: "string",
            after: "string",
            rationale: "string",
          },
        ],
        suggestedAdditions: ["string"],
      },
      targetJob: {
        company: job.company,
        description: job.jobDescription,
        requirements: job.signalReview.requirements,
        roleTitle: job.roleTitle,
        trackedKeywords: job.signalReview.keywords,
        tools: job.signalReview.tools,
      },
      approvedResumeText: resumeText,
    },
    null,
    2,
  );

  return {
    systemPrompt,
    userPrompt,
    egressPreview: [
      "Provider request preview",
      "",
      `Target: ${jobLabel}`,
      "",
      "System instructions:",
      systemPrompt,
      "",
      "User payload:",
      userPrompt,
    ].join("\n"),
  };
}

export function createTailoringProposal({
  job,
  model,
  originalResumeText,
  provider,
  response,
}: {
  job: JobApplication;
  model: string;
  originalResumeText: string;
  provider: RemoteProviderKind;
  response: AiTailoringProviderResponse;
}): AiTailoringProposal {
  const parsed = parseTailoringProviderText(response.outputText);
  const guarded = guardUnsupportedLines(
    parsed.revisedResumeText || originalResumeText,
    originalResumeText,
  );
  const suggestedAdditions = uniqueStrings([
    ...parsed.suggestedAdditions,
    ...guarded.unsupportedLines,
  ]);

  return {
    id: createAiId("ai_proposal"),
    createdAt: new Date().toISOString(),
    provider,
    model,
    providerRequestId: response.providerRequestId ?? null,
    jobLabel: formatJobLabel(job),
    revisedText: guarded.safeText || originalResumeText,
    changes: parsed.changes,
    suggestedAdditions,
    unsupportedLines: guarded.unsupportedLines,
    rawProviderText: response.outputText,
    usage: response.usage ?? null,
  };
}

export function parseTailoringProviderText(
  outputText: string,
): ParsedTailoringResponse {
  const parsed = parseJsonObject(outputText);

  if (!isRecord(parsed)) {
    return {
      revisedResumeText: outputText.trim(),
      changes: [],
      suggestedAdditions: [],
    };
  }

  return {
    revisedResumeText: getString(parsed.revisedResumeText),
    changes: Array.isArray(parsed.changes)
      ? parsed.changes.filter(isAiProposalChange)
      : [],
    suggestedAdditions: Array.isArray(parsed.suggestedAdditions)
      ? parsed.suggestedAdditions.filter(isString)
      : [],
  };
}

export function guardUnsupportedLines(
  revisedText: string,
  sourceText: string,
): { safeText: string; unsupportedLines: string[] } {
  const sourceTokens = new Set(contentTokens(sourceText));
  const safeLines: string[] = [];
  const unsupportedLines: string[] = [];

  revisedText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      safeLines.push("");
      return;
    }

    if (isAlwaysSafeLine(trimmed) || isSupportedBySource(trimmed, sourceTokens)) {
      safeLines.push(line);
      return;
    }

    unsupportedLines.push(trimmed);
  });

  return {
    safeText: safeLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    unsupportedLines,
  };
}

function providerConfig(
  provider: RemoteProviderKind,
  label: string,
  model: string,
  baseUrl: string,
  timestamp: string,
): AiProviderConfig {
  return {
    id: `provider_${provider}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    provider,
    label,
    model,
    baseUrl,
    enabled: true,
    hasSecret: false,
  };
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isAiProposalChange(value: unknown): value is AiProposalChange {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.section) &&
    isString(value.before) &&
    isString(value.after) &&
    isString(value.rationale)
  );
}

function isSupportedBySource(line: string, sourceTokens: Set<string>) {
  const tokens = contentTokens(line);

  if (tokens.length <= 2) {
    return true;
  }

  const unsupported = tokens.filter((token) => !sourceTokens.has(token));
  const unsupportedRatio = unsupported.length / tokens.length;

  return unsupported.length <= 2 || unsupportedRatio <= 0.32;
}

function isAlwaysSafeLine(line: string) {
  return (
    /^[A-Z][A-Z\s&/+-]{2,}$/.test(line) ||
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(line) ||
    /^[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(line) ||
    /^https?:\/\//i.test(line) ||
    /^[\w\s,.-]+ \| [\w\s@+:/.,-]+$/.test(line)
  );
}

function contentTokens(text: string) {
  const stopWords = new Set([
    "about",
    "after",
    "also",
    "and",
    "for",
    "from",
    "into",
    "that",
    "the",
    "their",
    "this",
    "with",
    "without",
    "your",
  ]);

  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !stopWords.has(token));
}

function formatJobLabel(job: JobApplication) {
  return [job.roleTitle, job.company].filter(Boolean).join(" at ") || "Target job";
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function createAiId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
