export type TextSignalAnalysis = {
  requirements: string[];
  responsibilities: string[];
  senioritySignals: string[];
  keywords: string[];
  tools: string[];
};

export type TextMatchScore = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedTools: string[];
  missingTools: string[];
};

const knownTools = [
  "accessibility",
  "anthropic",
  "aws",
  "azure",
  "docker",
  "electron",
  "figma",
  "gcp",
  "github",
  "graphql",
  "javascript",
  "kubernetes",
  "latex",
  "llm",
  "node",
  "ollama",
  "openai",
  "postgresql",
  "python",
  "react",
  "rest",
  "sqlite",
  "tailwind",
  "typescript",
  "vite",
];

const phraseSignals = [
  "ai egress",
  "ats",
  "data model",
  "data models",
  "design system",
  "design systems",
  "local first",
  "local-first",
  "offline first",
  "offline-first",
  "privacy sensitive",
  "privacy-sensitive",
  "product engineer",
  "resume tailoring",
  "source of truth",
  "structured editing",
  "type safety",
  "user review",
  "workflow tools",
];

const stopWords = new Set([
  "about",
  "above",
  "across",
  "after",
  "again",
  "against",
  "also",
  "among",
  "and",
  "any",
  "are",
  "around",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "candidate",
  "company",
  "for",
  "from",
  "have",
  "has",
  "here",
  "into",
  "its",
  "job",
  "more",
  "must",
  "not",
  "our",
  "over",
  "per",
  "role",
  "that",
  "the",
  "their",
  "this",
  "through",
  "to",
  "using",
  "with",
  "will",
  "work",
  "you",
  "your",
]);

export function analyzeJobText(text: string): TextSignalAnalysis {
  const normalizedText = normalizeText(text);
  const statements = splitStatements(text);
  const keywords = extractKeywords(text);
  const tools = knownTools.filter((tool) => textContainsTerm(normalizedText, tool));

  return {
    requirements: unique(
      statements.filter((statement) =>
        /(\brequired\b|\brequirements?\b|\bmust\b|\bneed\b|\bneeds\b|\bexperience\b|\bproficient\b|\bfamiliar\b|\bknowledge\b|\byears?\b)/i.test(
          statement,
        ),
      ),
    ).slice(0, 8),
    responsibilities: unique(
      statements.filter((statement) =>
        /(\bbuild\b|\bbuilding\b|\bown\b|\blead\b|\bdesign\b|\bimplement\b|\bship\b|\bmaintain\b|\bimprove\b|\bcollaborate\b|\bpartner\b|\bdrive\b)/i.test(
          statement,
        ),
      ),
    ).slice(0, 8),
    senioritySignals: unique(
      statements.filter((statement) =>
        /(\bsenior\b|\blead\b|\bmentor\b|\barchitect\b|\bstrategy\b|\bstakeholder\b|\bcross-functional\b|\bambiguous\b|\bownership\b|\bown\b)/i.test(
          statement,
        ),
      ),
    ).slice(0, 6),
    keywords,
    tools,
  };
}

export function scoreTextAgainstTarget(
  sourceText: string,
  targetText: string,
): TextMatchScore {
  const targetSignals = analyzeJobText(targetText);
  const sourceNormalized = normalizeText(sourceText);
  const matchedKeywords = targetSignals.keywords.filter((keyword) =>
    textContainsTerm(sourceNormalized, keyword),
  );
  const matchedTools = targetSignals.tools.filter((tool) =>
    textContainsTerm(sourceNormalized, tool),
  );
  const missingKeywords = targetSignals.keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );
  const missingTools = targetSignals.tools.filter(
    (tool) => !matchedTools.includes(tool),
  );
  const totalWeight =
    targetSignals.keywords.length + targetSignals.tools.length * 1.5;
  const matchedWeight = matchedKeywords.length + matchedTools.length * 1.5;

  return {
    score:
      totalWeight === 0
        ? 0
        : Math.min(100, Math.round((matchedWeight / totalWeight) * 100)),
    matchedKeywords,
    missingKeywords,
    matchedTools,
    missingTools,
  };
}

export function extractKeywords(text: string, limit = 18): string[] {
  const normalizedText = normalizeText(text);
  const phraseMatches = phraseSignals.filter((phrase) =>
    textContainsTerm(normalizedText, phrase),
  );
  const counts = new Map<string, number>();

  tokenize(text).forEach((token) => {
    if (token.length < 3 || stopWords.has(token) || /^\d+$/.test(token)) {
      return;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  const ranked = Array.from(counts.entries())
    .sort(([termA, countA], [termB, countB]) => {
      if (countA !== countB) {
        return countB - countA;
      }

      return termA.localeCompare(termB);
    })
    .map(([term]) => term);

  return unique([...phraseMatches, ...ranked]).slice(0, limit);
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w+#.\s-]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).match(/[a-z0-9][a-z0-9+#.]*/g) ?? [];
}

function splitStatements(text: string): string[] {
  return text
    .split(/\r?\n|[.;]\s+/)
    .map((statement) => statement.replace(/^[-*]\s*/, "").trim())
    .filter((statement) => statement.length >= 12);
}

function textContainsTerm(normalizedText: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) {
    return false;
  }

  return new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}($|\\s)`).test(
    normalizedText,
  );
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
