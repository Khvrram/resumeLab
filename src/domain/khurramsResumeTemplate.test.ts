import { describe, expect, it } from "vitest";
import { createSampleProfile } from "../components/profileTypes";
import { buildResumeDraft } from "./resumeDraft";
import {
  paginateResumeSections,
  parseResumePreviewFromLatex,
  parseResumePreviewFromText,
  renderKhurramsResumeLatex,
} from "./khurramsResumeTemplate";

describe("khurramsResumeTemplate", () => {
  it("renders a KhurramsResume-style LaTeX document", () => {
    const draft = buildResumeDraft(createSampleProfile());
    const latex = renderKhurramsResumeLatex(draft);

    expect(latex).toContain("\\documentclass[letterpaper,11pt]{article}");
    expect(latex).toContain("\\newcommand{\\resumeProjectHeading}");
    expect(latex).toContain("\\section{Experience}");
  });

  it("parses normal text into preview sections", () => {
    const preview = parseResumePreviewFromText(`Khurram Valiyev
Software Engineer
khurram@example.com

EXPERIENCE
Research Assistant | Florida Tech | 2025 - Present
- Reduced execution time from 6 hours to 5 minutes

PROJECTS
Sator | ESP32, Python
- Built an agricultural rover`);

    expect(preview.name).toBe("Khurram Valiyev");
    expect(preview.sections).toHaveLength(2);
    expect(preview.sections[0].blocks[0].bullets[0]).toContain("6 hours");
  });

  it("parses LaTeX sections into preview sections", () => {
    const preview = parseResumePreviewFromLatex(`\\begin{document}
\\begin{center}
{\\Huge \\scshape Khurram Valiyev} \\\\
\\small khurram@example.com
\\end{center}
\\section{Projects}
\\resumeProjectHeading{\\textbf{Sator} $|$ \\emph{ESP32, Python}}{2025}
\\resumeItemListStart
\\resumeItem{Built an agricultural rover}
\\resumeItemListEnd
\\end{document}`);

    expect(preview.name).toBe("Khurram Valiyev");
    expect(preview.contact).toContain("khurram@example.com");
    expect(preview.sections[0].title).toBe("Projects");
  });

  it("keeps the CV preview split across two pages", () => {
    const draft = buildResumeDraft(createSampleProfile());
    const preview = parseResumePreviewFromLatex(renderKhurramsResumeLatex(draft));
    const [firstPage, secondPage] = paginateResumeSections(preview.sections);

    expect(firstPage.length).toBeGreaterThan(0);
    expect(secondPage.length).toBeGreaterThan(0);
  });
});
