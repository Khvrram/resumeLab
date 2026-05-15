import {
  analyzeJobText,
  scoreTextAgainstTarget,
  type TextMatchScore,
} from "./textSignals";
import type {
  EducationEntry,
  ExperienceEntry,
  OptionalSection,
  ProjectEntry,
  ResumeProfile,
  SkillGroup,
  VisibilityStatus,
} from "../components/profileTypes";

export type ResumeDraftSectionId =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "optional";

export type ResumeDraftSection = {
  id: ResumeDraftSectionId;
  title: string;
  lines: string[];
};

export type ResumeDraft = {
  generatedAt: string;
  profileName: string;
  headline: string;
  contactLine: string;
  sourceProfileUpdatedAt: string;
  sections: ResumeDraftSection[];
  jobSignals: ReturnType<typeof analyzeJobText>;
  match: TextMatchScore;
};

export type ResumeDraftOptions = {
  jobDescription?: string;
  maxExperienceBullets?: number;
  maxProjectBullets?: number;
};

export function buildResumeDraft(
  profile: ResumeProfile,
  options: ResumeDraftOptions = {},
): ResumeDraft {
  const jobDescription = options.jobDescription ?? "";
  const targetTerms = analyzeJobText(jobDescription).keywords;
  const maxExperienceBullets = options.maxExperienceBullets ?? 4;
  const maxProjectBullets = options.maxProjectBullets ?? 3;
  const sections = [
    buildSummarySection(profile),
    buildSkillsSection(profile.skills),
    buildExperienceSection(
      profile.experience,
      targetTerms,
      maxExperienceBullets,
    ),
    buildProjectsSection(profile.projects, targetTerms, maxProjectBullets),
    buildEducationSection(profile.education),
    buildOptionalSection(profile.optionalSections),
  ].filter((section): section is ResumeDraftSection => section.lines.length > 0);
  const draftText = renderResumePlainText({
    generatedAt: "",
    profileName: profile.basics.fullName,
    headline: profile.basics.headline,
    contactLine: buildContactLine(profile),
    sourceProfileUpdatedAt: profile.updatedAt,
    sections,
    jobSignals: analyzeJobText(jobDescription),
    match: {
      score: 0,
      matchedKeywords: [],
      missingKeywords: [],
      matchedTools: [],
      missingTools: [],
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    profileName: profile.basics.fullName,
    headline: profile.basics.headline,
    contactLine: buildContactLine(profile),
    sourceProfileUpdatedAt: profile.updatedAt,
    sections,
    jobSignals: analyzeJobText(jobDescription),
    match: scoreTextAgainstTarget(draftText, jobDescription),
  };
}

export function renderResumePlainText(draft: ResumeDraft): string {
  return [
    draft.profileName,
    draft.headline,
    draft.contactLine,
    "",
    ...draft.sections.flatMap((section) => [
      section.title.toUpperCase(),
      ...section.lines,
      "",
    ]),
  ]
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderResumeLatex(draft: ResumeDraft): string {
  const renderedSections = draft.sections
    .map(
      (section) => `
\\section*{${escapeLatex(section.title)}}
${section.lines.map(renderLatexLine).join("\n")}
`,
    )
    .join("\n");

  return `\\documentclass[10pt]{article}
\\usepackage[margin=0.65in]{geometry}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\setlist[itemize]{leftmargin=*, itemsep=2pt, topsep=2pt}
\\pagenumbering{gobble}

\\begin{document}
\\begin{center}
{\\LARGE \\textbf{${escapeLatex(draft.profileName || "Resume")}}}\\\\
${escapeLatex(draft.headline)}\\\\
${escapeLatex(draft.contactLine)}
\\end{center}

${renderedSections}
\\end{document}
`;
}

export function buildAiEgressPreview(
  profile: ResumeProfile,
  jobDescription: string,
): string {
  const draft = buildResumeDraft(profile, { jobDescription });
  const noContactDraft: ResumeDraft = {
    ...draft,
    contactLine: profile.privacy.keepContactPrivateByDefault
      ? "[contact details withheld]"
      : draft.contactLine,
  };

  return [
    "Approved resume facts:",
    renderResumePlainText(noContactDraft),
    "",
    "Job description:",
    jobDescription.trim() || "[no job description provided]",
  ].join("\n");
}

export function createResumeFileName(
  profile: ResumeProfile,
  extension: "txt" | "tex",
): string {
  const baseName = (profile.basics.fullName || "resume")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${baseName || "resume"}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function buildSummarySection(profile: ResumeProfile): ResumeDraftSection {
  return {
    id: "summary",
    title: "Summary",
    lines:
      isEligible(profile.basics.visibility) && profile.basics.summary.trim()
        ? [profile.basics.summary.trim()]
        : [],
  };
}

function buildSkillsSection(skills: SkillGroup[]): ResumeDraftSection {
  return {
    id: "skills",
    title: "Skills",
    lines: skills
      .filter((group) => isEligible(group.visibility))
      .map((group) => {
        const skillList = group.skills.map((skill) => skill.trim()).filter(Boolean);
        return skillList.length > 0
          ? `${group.category || "Skills"}: ${skillList.join(", ")}`
          : "";
      })
      .filter(Boolean),
  };
}

function buildExperienceSection(
  experience: ExperienceEntry[],
  targetTerms: string[],
  maxBullets: number,
): ResumeDraftSection {
  return {
    id: "experience",
    title: "Experience",
    lines: experience
      .filter((entry) => isEligible(entry.visibility))
      .flatMap((entry) => [
        `${entry.role || "Role"} | ${entry.company || "Company"} | ${formatDates(
          entry.startDate,
          entry.endDate,
          entry.isCurrent,
        )}`,
        ...rankBullets(entry.bullets, targetTerms)
          .slice(0, maxBullets)
          .map((bullet) => `- ${bullet}`),
      ]),
  };
}

function buildProjectsSection(
  projects: ProjectEntry[],
  targetTerms: string[],
  maxBullets: number,
): ResumeDraftSection {
  return {
    id: "projects",
    title: "Projects",
    lines: projects
      .filter((project) => isEligible(project.visibility))
      .flatMap((project) => [
        `${project.title || "Project"}${
          project.technologies.length > 0
            ? ` | ${project.technologies.join(", ")}`
            : ""
        }`,
        project.description ? `- ${project.description}` : "",
        ...rankBullets(project.bullets, targetTerms)
          .slice(0, maxBullets)
          .map((bullet) => `- ${bullet}`),
      ])
      .filter(Boolean),
  };
}

function buildEducationSection(
  education: EducationEntry[],
): ResumeDraftSection {
  return {
    id: "education",
    title: "Education",
    lines: education
      .filter((entry) => isEligible(entry.visibility))
      .flatMap((entry) => [
        `${entry.degree}${entry.field ? `, ${entry.field}` : ""} | ${
          entry.school || "School"
        } | ${formatDates(entry.startDate, entry.endDate, false)}`,
        entry.notes ? `- ${entry.notes}` : "",
      ])
      .filter(Boolean),
  };
}

function buildOptionalSection(
  optionalSections: OptionalSection[],
): ResumeDraftSection {
  return {
    id: "optional",
    title: "Additional",
    lines: optionalSections
      .filter((entry) => isEligible(entry.visibility))
      .flatMap((entry) => [
        `${entry.title || entry.type}${entry.organization ? ` | ${entry.organization}` : ""}${
          entry.date ? ` | ${entry.date}` : ""
        }`,
        entry.description ? `- ${entry.description}` : "",
        ...entry.bullets.filter(Boolean).map((bullet) => `- ${bullet}`),
      ])
      .filter(Boolean),
  };
}

function buildContactLine(profile: ResumeProfile): string {
  if (!isEligible(profile.basics.visibility)) {
    return "";
  }

  return [
    profile.basics.location,
    profile.basics.email,
    profile.basics.phone,
    profile.basics.website,
    ...profile.basics.links
      .filter((link) => isEligible(link.visibility))
      .map((link) => link.url),
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .join(" | ");
}

function rankBullets(bullets: string[], targetTerms: string[]): string[] {
  return bullets
    .filter((bullet) => bullet.trim())
    .map((bullet, index) => ({
      bullet,
      index,
      score: targetTerms.filter((term) =>
        bullet.toLowerCase().includes(term.toLowerCase()),
      ).length,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ bullet }) => bullet);
}

function renderLatexLine(line: string): string {
  if (line.startsWith("- ")) {
    return `\\begin{itemize}\\item ${escapeLatex(line.slice(2))}\\end{itemize}`;
  }

  return `\\noindent ${escapeLatex(line)}\\\\`;
}

function escapeLatex(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function formatDates(startDate: string, endDate: string, isCurrent: boolean) {
  if (!startDate && !endDate && !isCurrent) {
    return "";
  }

  return `${startDate || "Start"} - ${isCurrent ? "Present" : endDate || "Present"}`;
}

function isEligible(visibility: VisibilityStatus): boolean {
  return visibility === "eligible";
}
