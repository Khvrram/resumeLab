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
  jobApplicationId: string;
  jobLabel: string;
  sourceResumeHash: string;
  revisedText: string;
  changes: AiProposalChange[];
  suggestedAdditions: string[];
  unsupportedLines: string[];
  rawProviderText: string;
  usage: AiTailoringProviderResponse["usage"];
};

export type AiProposalReviewChange = {
  id: string;
  kind: "insert" | "delete" | "replace";
  section: string;
  beforeStartLine: number;
  beforeEndLine: number;
  afterStartLine: number;
  afterEndLine: number;
  beforeLines: string[];
  afterLines: string[];
  rationale: string;
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
    jobApplicationId: job.id,
    jobLabel: formatJobLabel(job),
    sourceResumeHash: hashAiText(originalResumeText),
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

export function createAiProposalReviewChanges({
  originalText,
  proposal,
}: {
  originalText: string;
  proposal: AiTailoringProposal;
}): AiProposalReviewChange[] {
  const originalLines = splitReviewLines(originalText);
  const revisedLines = splitReviewLines(proposal.revisedText);
  const operations = diffLines(originalLines, revisedLines);
  const changes: AiProposalReviewChange[] = [];
  let originalIndex = 0;
  let revisedIndex = 0;
  let pendingBeforeStart = 0;
  let pendingAfterStart = 0;
  let pendingBeforeLines: string[] = [];
  let pendingAfterLines: string[] = [];

  const flushPending = () => {
    if (pendingBeforeLines.length === 0 && pendingAfterLines.length === 0) {
      return;
    }

    const beforeEndLine = pendingBeforeStart + pendingBeforeLines.length;
    const afterEndLine = pendingAfterStart + pendingAfterLines.length;
    const kind =
      pendingBeforeLines.length === 0
        ? "insert"
        : pendingAfterLines.length === 0
          ? "delete"
          : "replace";

    changes.push({
      id: `change_${changes.length + 1}`,
      kind,
      section: findReviewSection(
        originalLines,
        revisedLines,
        pendingBeforeStart,
        pendingAfterStart,
      ),
      beforeStartLine: pendingBeforeStart,
      beforeEndLine,
      afterStartLine: pendingAfterStart,
      afterEndLine,
      beforeLines: pendingBeforeLines,
      afterLines: pendingAfterLines,
      rationale: findChangeRationale(
        proposal.changes,
        pendingBeforeLines,
        pendingAfterLines,
      ),
    });

    pendingBeforeLines = [];
    pendingAfterLines = [];
  };

  operations.forEach((operation) => {
    if (operation.type === "equal") {
      flushPending();
      originalIndex += 1;
      revisedIndex += 1;
      pendingBeforeStart = originalIndex;
      pendingAfterStart = revisedIndex;
      return;
    }

    if (pendingBeforeLines.length === 0 && pendingAfterLines.length === 0) {
      pendingBeforeStart = originalIndex;
      pendingAfterStart = revisedIndex;
    }

    if (operation.type === "delete") {
      pendingBeforeLines.push(operation.line);
      originalIndex += 1;
    } else {
      pendingAfterLines.push(operation.line);
      revisedIndex += 1;
    }
  });

  flushPending();

  return changes;
}

export function applyAiProposalReviewChanges({
  acceptedChangeIds,
  editedAfterTextById = {},
  originalText,
  reviewChanges,
}: {
  acceptedChangeIds: Set<string>;
  editedAfterTextById?: Record<string, string>;
  originalText: string;
  reviewChanges: AiProposalReviewChange[];
}): string {
  const originalLines = splitReviewLines(originalText);
  const sortedChanges = [...reviewChanges].sort(
    (left, right) => left.beforeStartLine - right.beforeStartLine,
  );
  const outputLines: string[] = [];
  let cursor = 0;

  sortedChanges.forEach((change) => {
    if (change.beforeStartLine < cursor) {
      return;
    }

    outputLines.push(...originalLines.slice(cursor, change.beforeStartLine));

    if (acceptedChangeIds.has(change.id)) {
      outputLines.push(
        ...splitReviewLines(editedAfterTextById[change.id] ?? change.afterLines.join("\n")),
      );
    } else {
      outputLines.push(...change.beforeLines);
    }

    cursor = change.beforeEndLine;
  });

  outputLines.push(...originalLines.slice(cursor));

  return trimTrailingBlankLines(outputLines).join("\n");
}

export function hashAiText(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
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

type LineDiffOperation =
  | { type: "equal"; line: string }
  | { type: "insert"; line: string }
  | { type: "delete"; line: string };

function diffLines(originalLines: string[], revisedLines: string[]) {
  const table = createLcsTable(originalLines, revisedLines);
  const operations: LineDiffOperation[] = [];
  let originalIndex = 0;
  let revisedIndex = 0;

  while (
    originalIndex < originalLines.length ||
    revisedIndex < revisedLines.length
  ) {
    if (
      originalIndex < originalLines.length &&
      revisedIndex < revisedLines.length &&
      originalLines[originalIndex] === revisedLines[revisedIndex]
    ) {
      operations.push({
        line: originalLines[originalIndex],
        type: "equal",
      });
      originalIndex += 1;
      revisedIndex += 1;
    } else if (
      revisedIndex < revisedLines.length &&
      (originalIndex === originalLines.length ||
        table[originalIndex][revisedIndex + 1] >=
          table[originalIndex + 1][revisedIndex])
    ) {
      operations.push({
        line: revisedLines[revisedIndex],
        type: "insert",
      });
      revisedIndex += 1;
    } else {
      operations.push({
        line: originalLines[originalIndex],
        type: "delete",
      });
      originalIndex += 1;
    }
  }

  return operations;
}

function createLcsTable(originalLines: string[], revisedLines: string[]) {
  const table = Array.from({ length: originalLines.length + 1 }, () =>
    Array.from({ length: revisedLines.length + 1 }, () => 0),
  );

  for (let originalIndex = originalLines.length - 1; originalIndex >= 0; originalIndex -= 1) {
    for (let revisedIndex = revisedLines.length - 1; revisedIndex >= 0; revisedIndex -= 1) {
      table[originalIndex][revisedIndex] =
        originalLines[originalIndex] === revisedLines[revisedIndex]
          ? table[originalIndex + 1][revisedIndex + 1] + 1
          : Math.max(
              table[originalIndex + 1][revisedIndex],
              table[originalIndex][revisedIndex + 1],
            );
    }
  }

  return table;
}

function findReviewSection(
  originalLines: string[],
  revisedLines: string[],
  beforeStartLine: number,
  afterStartLine: number,
) {
  return (
    findNearestSection(originalLines, beforeStartLine) ||
    findNearestSection(revisedLines, afterStartLine) ||
    "Resume"
  );
}

function findNearestSection(lines: string[], startLine: number) {
  for (let index = Math.min(startLine, lines.length - 1); index >= 0; index -= 1) {
    const line = lines[index]?.trim();

    if (line && /^[A-Z][A-Z\s&/+-]{2,}$/.test(line)) {
      return toTitleCase(line);
    }
  }

  return "";
}

function findChangeRationale(
  changes: AiProposalChange[],
  beforeLines: string[],
  afterLines: string[],
) {
  const beforeText = beforeLines.join("\n").trim();
  const afterText = afterLines.join("\n").trim();
  const matchingChange = changes.find((change) => {
    const changeBefore = change.before.trim();
    const changeAfter = change.after.trim();

    return (
      (changeBefore && beforeText.includes(changeBefore)) ||
      (changeAfter && afterText.includes(changeAfter)) ||
      (changeBefore && changeAfter && beforeText && afterText &&
        changeBefore.includes(beforeText) &&
        changeAfter.includes(afterText))
    );
  });

  return matchingChange?.rationale.trim() || "AI proposed this resume text change for the selected job.";
}

function splitReviewLines(text: string) {
  if (!text) {
    return [];
  }

  return text.replace(/\r\n/g, "\n").split("\n");
}

function trimTrailingBlankLines(lines: string[]) {
  const nextLines = [...lines];

  while (nextLines.length > 0 && !nextLines[nextLines.length - 1].trim()) {
    nextLines.pop();
  }

  return nextLines;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
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

  if (unsupported.some(isSensitiveResumeToken)) {
    return false;
  }

  return unsupported.length <= 2 || unsupportedRatio <= 0.32;
}

function isSensitiveResumeToken(token: string) {
  return /[0-9+#.]/.test(token) || token.length <= 3;
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
  const shortSignificantTokens = new Set([
    "ai",
    "api",
    "aws",
    "c++",
    "gcp",
    "go",
    "ml",
    "r",
    "sql",
    "ui",
    "ux",
  ]);

  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        !stopWords.has(token) &&
        (token.length > 3 ||
          /[0-9+#.]/.test(token) ||
          shortSignificantTokens.has(token)),
    );
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
