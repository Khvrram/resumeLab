import { describe, expect, it } from "vitest";
import {
  buildTailoringPrompt,
  createDefaultAiProviderConfigs,
  createTailoringProposal,
  guardUnsupportedLines,
  parseTailoringProviderText,
} from "./aiTailoring";
import { createJobApplication } from "./v2Actions";

describe("aiTailoring", () => {
  const job = createJobApplication({
    company: "CivicForms",
    jobDescription:
      "Build privacy-sensitive workflow tools with React, TypeScript, local data models, and careful user-review paths.",
    roleTitle: "Senior Product Engineer",
  });
  const resumeText = [
    "Alex Morgan",
    "Local-first product engineer",
    "New York, NY | alex@example.com",
    "",
    "SUMMARY",
    "Product-minded engineer focused on privacy-preserving tools and local workflows.",
    "",
    "EXPERIENCE",
    "Senior Product Engineer | Northstar Analytics | 2022-08 - Present",
    "- Led a React and TypeScript migration that reduced dashboard load time by 38%.",
  ].join("\n");

  it("builds an explicit provider egress prompt", () => {
    const prompt = buildTailoringPrompt({ job, resumeText });

    expect(prompt.systemPrompt).toContain("Use only the approved resume facts");
    expect(prompt.userPrompt).toContain("Senior Product Engineer");
    expect(prompt.userPrompt).toContain("approvedResumeText");
    expect(prompt.egressPreview).toContain("Provider request preview");
    expect(prompt.egressPreview).toContain("Alex Morgan");
    expect(prompt.egressPreview).toContain("React and TypeScript migration");
  });

  it("parses strict or fenced provider JSON", () => {
    const parsed = parseTailoringProviderText(`\`\`\`json
{
  "revisedResumeText": "SUMMARY\\nReact and TypeScript workflow engineer.",
  "changes": [
    {
      "section": "Summary",
      "before": "Old",
      "after": "New",
      "rationale": "Targeted React wording"
    }
  ],
  "suggestedAdditions": ["Add payments scale if true."]
}
\`\`\``);

    expect(parsed.revisedResumeText).toContain("React and TypeScript");
    expect(parsed.changes).toHaveLength(1);
    expect(parsed.suggestedAdditions).toEqual(["Add payments scale if true."]);
  });

  it("separates unsupported provider claims from applyable resume text", () => {
    const guarded = guardUnsupportedLines(
      [
        "SUMMARY",
        "Product-minded engineer focused on privacy-preserving tools and local workflows.",
        "- Managed a Kubernetes payments platform for 20 million users.",
        "- Led a React and TypeScript migration that reduced dashboard load time by 38%.",
      ].join("\n"),
      resumeText,
    );

    expect(guarded.safeText).toContain("React and TypeScript migration");
    expect(guarded.safeText).not.toContain("20 million users");
    expect(guarded.unsupportedLines).toEqual([
      "- Managed a Kubernetes payments platform for 20 million users.",
    ]);
  });

  it("creates default provider metadata without secrets", () => {
    const configs = createDefaultAiProviderConfigs("2026-05-26T00:00:00.000Z");

    expect(configs.map((config) => config.provider)).toEqual([
      "openai",
      "anthropic",
      "google",
      "openrouter",
    ]);
    expect(configs.every((config) => config.hasSecret === false)).toBe(true);
  });

  it("creates a proposal that keeps unsupported facts separate", () => {
    const response = {
      outputText: JSON.stringify({
        changes: [],
        revisedResumeText: [
          "SUMMARY",
          "Product-minded engineer focused on privacy-preserving tools and local workflows.",
          "- Built HIPAA claims processing for 20 hospitals.",
        ].join("\n"),
        suggestedAdditions: ["Mention HIPAA only if it is true."],
      }),
      providerRequestId: "req_123",
      usage: { totalTokens: 120 },
    };

    const proposal = createTailoringProposal({
      job,
      model: "gpt-test",
      originalResumeText: resumeText,
      provider: "openai",
      response,
    });

    expect(proposal.providerRequestId).toBe("req_123");
    expect(proposal.revisedText).not.toContain("20 hospitals");
    expect(proposal.suggestedAdditions).toEqual([
      "Mention HIPAA only if it is true.",
      "- Built HIPAA claims processing for 20 hospitals.",
    ]);
  });
});
