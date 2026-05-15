import { describe, expect, it, vi } from "vitest";
import { createSampleV2Workspace } from "./v2";
import {
  checkLocalModelEndpoint,
  createJobApplication,
  createLocalModelEndpoint,
  createPromptProfile,
  createTemplateDefinition,
  duplicateTemplateDefinition,
  refreshJobApplicationSignals,
  renderPromptPreview,
  updateJobApplicationStatus,
} from "./v2Actions";

describe("v2Actions", () => {
  it("creates valid templates and duplicates them as custom records", () => {
    const template = createTemplateDefinition({ name: "Focused ATS" });
    const duplicate = duplicateTemplateDefinition(template);

    expect(template.name).toBe("Focused ATS");
    expect(template.mapping.some((item) => item.required)).toBe(true);
    expect(duplicate.id).not.toBe(template.id);
    expect(duplicate.name).toBe("Focused ATS Copy");
    expect(duplicate.source).toBe("custom");
  });

  it("creates and refreshes job applications with extracted signals", () => {
    const job = createJobApplication({
      roleTitle: "Senior Product Engineer",
      company: "CivicForms",
      jobDescription:
        "Senior engineer must build React and TypeScript workflow tools with local-first SQLite data models.",
    });
    const refreshed = refreshJobApplicationSignals(job);

    expect(refreshed.signalReview.keywords).toContain("local-first");
    expect(refreshed.signalReview.tools).toEqual(
      expect.arrayContaining(["react", "typescript", "sqlite"]),
    );
    expect(refreshed.signalReview.extractedAt).not.toBeNull();
  });

  it("updates job status with history", () => {
    const job = createJobApplication();
    const updated = updateJobApplicationStatus(job, "applied", "Submitted PDF.");

    expect(updated.status).toBe("applied");
    expect(updated.statusHistory.at(-1)).toMatchObject({
      status: "applied",
      note: "Submitted PDF.",
    });
  });

  it("renders prompt previews with job and resume context", () => {
    const workspace = createSampleV2Workspace();
    const preview = renderPromptPreview({
      promptProfile: createPromptProfile(),
      job: workspace.jobApplications[0],
      resumeText: "React TypeScript SQLite local-first resume facts",
    });

    expect(preview.userPrompt).toContain(workspace.jobApplications[0].company);
    expect(preview.userPrompt).toContain("React TypeScript SQLite");
    expect(preview.contextSummary.at(-1)).toBe(
      "Context approval required before provider call",
    );
  });

  it("checks local model endpoints without storing secrets", async () => {
    const endpoint = createLocalModelEndpoint({ providerKind: "ollama" });
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));

    const result = await checkLocalModelEndpoint(endpoint, fetcher);

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:11434/api/tags", {
      method: "GET",
    });
    expect(result.readiness).toBe("ready");
    expect(result.failureMessage).toBeNull();
  });
});
