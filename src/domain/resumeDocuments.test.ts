import { describe, expect, it } from "vitest";
import { createSampleProfile } from "../components/profileTypes";
import { buildResumeDraft } from "./resumeDraft";
import {
  createResumeDocument,
  createResumeRevision,
  findDocumentForJob,
  refreshResumeDocumentFromDraft,
  restoreResumeRevision,
  updateResumeDocumentContent,
} from "./resumeDocuments";

describe("resumeDocuments", () => {
  it("creates a job-specific document with an initial revision", () => {
    const profile = createSampleProfile();
    const draft = buildResumeDraft(profile);
    const document = createResumeDocument({
      draft,
      jobApplicationId: "job-1",
      profile,
      title: "CivicForms draft",
    });

    expect(document.jobApplicationId).toBe("job-1");
    expect(document.title).toBe("CivicForms draft");
    expect(document.textContent).toContain(profile.basics.fullName);
    expect(document.latexContent).toContain("\\documentclass");
    expect(document.revisions).toHaveLength(1);
    expect(document.revisions[0].label).toBe("Initial generated draft");
  });

  it("creates and restores manual revisions without losing the current checkpoint", () => {
    const profile = createSampleProfile();
    const draft = buildResumeDraft(profile);
    const original = createResumeDocument({
      draft,
      jobApplicationId: "job-1",
      profile,
    });
    const edited = createResumeRevision(
      updateResumeDocumentContent(original, {
        textContent: `${original.textContent}\n\nCUSTOM SECTION`,
      }),
      "Edited text",
    );
    const restored = restoreResumeRevision(edited, original.revisions[0].id);

    expect(edited.revisions[0].label).toBe("Edited text");
    expect(restored.textContent).toBe(original.textContent);
    expect(restored.revisions[0].label).toBe("Before restore");
    expect(restored.revisions[0].textContent).toContain("CUSTOM SECTION");
  });

  it("refreshes from profile facts while checkpointing prior manual content", () => {
    const profile = createSampleProfile();
    const originalDraft = buildResumeDraft(profile);
    const document = updateResumeDocumentContent(
      createResumeDocument({
        draft: originalDraft,
        jobApplicationId: "job-1",
        profile,
      }),
      { textContent: "manual edit" },
    );
    const updatedProfile = {
      ...profile,
      basics: {
        ...profile.basics,
        summary: "Updated profile summary.",
      },
      updatedAt: "2026-05-25T12:00:00.000Z",
    };
    const refreshed = refreshResumeDocumentFromDraft(
      document,
      buildResumeDraft(updatedProfile),
      updatedProfile,
    );

    expect(refreshed.textContent).toContain("Updated profile summary.");
    expect(refreshed.sourceProfileUpdatedAt).toBe(updatedProfile.updatedAt);
    expect(refreshed.revisions[0].label).toBe("Before profile refresh");
    expect(refreshed.revisions[0].textContent).toBe("manual edit");
  });

  it("finds a matching job document before falling back to the first document", () => {
    const profile = createSampleProfile();
    const draft = buildResumeDraft(profile);
    const first = createResumeDocument({
      draft,
      jobApplicationId: "job-1",
      profile,
      title: "First",
    });
    const second = createResumeDocument({
      draft,
      jobApplicationId: "job-2",
      profile,
      title: "Second",
    });

    expect(findDocumentForJob([first, second], "job-2")?.title).toBe("Second");
    expect(findDocumentForJob([first, second], "unknown")?.title).toBe("First");
    expect(findDocumentForJob([], "job-1")).toBeNull();
  });
});
