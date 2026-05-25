import { describe, expect, it } from "vitest";
import { createSampleProfile, normalizeProfile } from "../components/profileTypes";
import { createSampleProfile as createCanonicalSampleProfile } from "./profile";
import {
  buildAiEgressPreview,
  buildResumeDraft,
  renderResumeLatex,
  renderResumePlainText,
} from "./resumeDraft";

describe("resumeDraft", () => {
  it("builds a resume from eligible profile facts", () => {
    const profile = createSampleProfile();
    const draft = buildResumeDraft(profile, {
      jobDescription:
        "We need React, TypeScript, SQLite, and offline-first workflow tools.",
    });
    const plainText = renderResumePlainText(draft);

    expect(plainText).toContain("Maya Rios");
    expect(plainText).toContain("React");
    expect(plainText).toContain("TypeScript");
    expect(plainText).toContain("SQLite");
    expect(plainText).not.toContain("AWS Certified Cloud Practitioner");
    expect(draft.match.score).toBeGreaterThan(0);
  });

  it("escapes LaTeX control characters", () => {
    const profile = createSampleProfile();
    profile.basics.fullName = "Maya & Co";
    profile.experience[0].bullets = ["Improved cost by 20% for C# tools."];

    const latex = renderResumeLatex(buildResumeDraft(profile));

    expect(latex).toContain("Maya \\& Co");
    expect(latex).toContain("20\\%");
    expect(latex).toContain("C\\# tools");
  });

  it("withholds contact details from AI egress preview when configured", () => {
    const profile = createSampleProfile();
    profile.privacy.keepContactPrivateByDefault = true;

    const preview = buildAiEgressPreview(profile, "React role");

    expect(preview).toContain("[contact details withheld]");
    expect(preview).not.toContain(profile.basics.email);
  });

  it("excludes canonical private and excluded bullet facts from drafts and AI egress", () => {
    const profile = normalizeProfile(createCanonicalSampleProfile());
    const plainText = renderResumePlainText(buildResumeDraft(profile));
    const egressPreview = buildAiEgressPreview(profile, "React SQLite role");

    expect(plainText).not.toContain("internal customer notes");
    expect(plainText).not.toContain("legacy Backbone");
    expect(egressPreview).not.toContain("internal customer notes");
    expect(egressPreview).not.toContain("legacy Backbone");
  });
});
