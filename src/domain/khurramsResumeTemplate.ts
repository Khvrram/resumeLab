import { renderResumePlainText, type ResumeDraft } from "./resumeDraft";

export type ResumePreviewBlock = {
  heading: string;
  meta: string;
  bullets: string[];
};

export type ResumePreviewSection = {
  title: string;
  blocks: ResumePreviewBlock[];
};

export type ResumePreviewDocument = {
  name: string;
  subtitle: string;
  contact: string;
  sections: ResumePreviewSection[];
};

export function renderKhurramsResumeText(draft: ResumeDraft): string {
  return renderResumePlainText(draft);
}

export function renderKhurramsResumeLatex(draft: ResumeDraft): string {
  return renderKhurramsResumePreviewLatex({
    name: draft.profileName || "Resume",
    subtitle: "",
    contact: draft.contactLine,
    sections: draft.sections.map((section) => ({
      title: section.title,
      blocks: linesToBlocks(section.lines),
    })),
  });
}

export function renderKhurramsResumePreviewText(
  document: ResumePreviewDocument,
): string {
  const headerLines = [document.name, document.subtitle, document.contact]
    .map((line) => line.trim())
    .filter(Boolean);
  const sectionLines = document.sections.flatMap((section) => [
    "",
    section.title.trim().toUpperCase(),
    ...section.blocks.flatMap(renderPreviewBlockText),
  ]);

  return [...headerLines, ...sectionLines]
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderKhurramsResumePreviewLatex(
  document: ResumePreviewDocument,
): string {
  return `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\setlength{\\multicolsep}{-3.0pt}
\\setlength{\\columnsep}{-1pt}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.19in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.8in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-12pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{{#1}}
}

\\newcommand{\\resumeSubheading}[4]{
  \\item
    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\small#1 & \\textbf{\\small #2} \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{1.0\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & \\textbf{\\small #2}\\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\setlist[itemize]{leftmargin=0.2in, labelwidth=0.1in, labelsep=0.05in, itemsep=0pt, parsep=0pt}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}, itemsep=0pt, parsep=0pt]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}\\vspace{-8pt}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[itemsep=0pt, parsep=0pt]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
  {\\Huge \\scshape ${escapeLatex(document.name || "Resume")}} \\\\ \\vspace{1pt}
    \\small ${escapeLatex(
      [document.subtitle, document.contact]
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" | "),
    )}
    \\vspace{-5pt}
\\end{center}
\\vspace{-1pt}

${document.sections.map(renderPreviewLatexSection).join("\n")}

\\end{document}
`;
}

export function parseResumePreviewFromText(text: string): ResumePreviewDocument {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [name = "Resume", subtitle = "", contact = "", ...rest] = lines;
  const sections: ResumePreviewSection[] = [];
  let currentSection: ResumePreviewSection | null = null;
  let currentBlock: ResumePreviewBlock | null = null;

  rest.forEach((line) => {
    if (isSectionTitle(line)) {
      currentSection = { title: titleCase(line), blocks: [] };
      currentBlock = null;
      sections.push(currentSection);
      return;
    }

    if (!currentSection) {
      currentSection = { title: "Summary", blocks: [] };
      sections.push(currentSection);
    }

    if (line.startsWith("- ")) {
      if (!currentBlock) {
        currentBlock = { heading: "", meta: "", bullets: [] };
        currentSection.blocks.push(currentBlock);
      }

      currentBlock.bullets.push(line.slice(2));
      return;
    }

    currentBlock = createBlockFromHeading(line);
    currentSection.blocks.push(currentBlock);
  });

  return {
    name,
    subtitle,
    contact,
    sections,
  };
}

export function parseResumePreviewFromLatex(
  latex: string,
): ResumePreviewDocument {
  const body = latex
    .replace(/%.*$/gm, "")
    .replace(/\\newpage/g, "\n\\section{Page Break}\n");
  const name =
    matchFirst(body, /\\Huge\s+\\scshape\s+([^\\\n]+)/) ??
    matchFirst(body, /\{\\Huge\s+\\scshape\s+([^}]+)\}/) ??
    "Resume";
  const centerBody = matchFirst(
    body,
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/,
  );
  const contact = centerBody
    ? cleanupLatex(centerBody)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(1)
        .join(" ")
    : "";
  const sections: ResumePreviewSection[] = [];
  const sectionPattern =
    /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section\*?\{|\\end\{document\})/g;
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(body)) !== null) {
    const title = cleanupLatex(match[1]);

    if (title === "Page Break") {
      continue;
    }

    const sectionText = cleanupLatex(match[2]);
    const section = textLinesToSection(title, sectionText);

    if (section.blocks.length > 0) {
      sections.push(section);
    }
  }

  if (sections.length === 0) {
    return parseResumePreviewFromText(cleanupLatex(latex));
  }

  return {
    name: cleanupLatex(name),
    subtitle: "",
    contact,
    sections,
  };
}

export function paginateResumeSections(
  sections: ResumePreviewSection[],
): [ResumePreviewSection[], ResumePreviewSection[]] {
  const preferredBreakIndex = sections.findIndex((section) =>
    /projects?/i.test(section.title),
  );
  const breakIndex =
    preferredBreakIndex > 1
      ? preferredBreakIndex
      : Math.max(1, Math.ceil(sections.length / 2));

  return [sections.slice(0, breakIndex), sections.slice(breakIndex)];
}

function renderPreviewLatexSection(section: ResumePreviewSection): string {
  if (/skills?|summary/i.test(section.title)) {
    return `\\section{${escapeLatex(section.title)}}
\\resumeItemListStart
${section.blocks.flatMap(blockToSummaryLines).map((line) => `  \\resumeItem{${escapeLatex(line)}}`).join("\n")}
\\resumeItemListEnd`;
  }

  return `\\section{${escapeLatex(section.title)}}
\\resumeSubHeadingListStart
${section.blocks.map(renderLatexBlock).join("\n")}
\\resumeSubHeadingListEnd`;
}

function renderLatexBlock(block: ResumePreviewBlock): string {
  return `  \\resumeProjectHeading
    {\\textbf{${escapeLatex(block.heading || "Item")}}}{${escapeLatex(block.meta)}}
    \\resumeItemListStart
${block.bullets.map((bullet) => `      \\resumeItem{${escapeLatex(bullet)}}`).join("\n")}
    \\resumeItemListEnd`;
}

function linesToBlocks(lines: string[]): ResumePreviewBlock[] {
  const blocks: ResumePreviewBlock[] = [];
  let currentBlock: ResumePreviewBlock | null = null;

  lines.forEach((line) => {
    if (line.startsWith("- ")) {
      if (!currentBlock) {
        currentBlock = { heading: "Item", meta: "", bullets: [] };
        blocks.push(currentBlock);
      }

      currentBlock.bullets.push(line.slice(2));
      return;
    }

    currentBlock = createBlockFromHeading(line);
    blocks.push(currentBlock);
  });

  return blocks;
}

function renderPreviewBlockText(block: ResumePreviewBlock): string[] {
  const lines: string[] = [];
  const heading = [block.heading, block.meta]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" | ");

  if (heading) {
    lines.push(heading);
  }

  block.bullets
    .map((bullet) => bullet.trim())
    .filter(Boolean)
    .forEach((bullet) => lines.push(`- ${bullet}`));

  return lines;
}

function blockToSummaryLines(block: ResumePreviewBlock): string[] {
  const lines: string[] = [];

  if (block.heading.trim()) {
    lines.push(block.heading.trim());
  }

  block.bullets
    .map((bullet) => bullet.trim())
    .filter(Boolean)
    .forEach((bullet) => lines.push(bullet));

  return lines;
}

function createBlockFromHeading(line: string): ResumePreviewBlock {
  const parts = line
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    heading: parts.slice(0, 2).join(" | ") || line,
    meta: parts.slice(2).join(" | "),
    bullets: [],
  };
}

function textLinesToSection(
  title: string,
  sectionText: string,
): ResumePreviewSection {
  const lines = sectionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const section: ResumePreviewSection = { title, blocks: [] };
  let currentBlock: ResumePreviewBlock | null = null;

  lines.forEach((line) => {
    const normalized = line.replace(/^[-*]\s*/, "");
    const looksLikeHeading =
      !/^\\?item\b/i.test(line) &&
      !line.startsWith("•") &&
      !line.startsWith("-") &&
      normalized.length > 0 &&
      normalized.length < 140;

    if (looksLikeHeading && (!currentBlock || currentBlock.bullets.length > 0)) {
      currentBlock = createBlockFromHeading(normalized);
      section.blocks.push(currentBlock);
      return;
    }

    if (!currentBlock) {
      currentBlock = { heading: "", meta: "", bullets: [] };
      section.blocks.push(currentBlock);
    }

    currentBlock.bullets.push(normalized.replace(/^item\s*/i, ""));
  });

  return section;
}

function cleanupLatex(value: string): string {
  return value
    .replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, "$2")
    .replace(/\\textbf\{([^}]*)\}/g, "$1")
    .replace(/\\textit\{([^}]*)\}/g, "$1")
    .replace(/\\emph\{([^}]*)\}/g, "$1")
    .replace(/\\resumeItem\{([^}]*)\}/g, "- $1\n")
    .replace(/\\item\b/g, "- ")
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\$?\|?\$/g, "|")
    .replace(/\\\\/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSectionTitle(line: string): boolean {
  return /^[A-Z][A-Z\s&/+-]{2,}$/.test(line);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, "&");
}

function matchFirst(value: string, pattern: RegExp): string | null {
  const match = value.match(pattern);
  return match?.[1]?.trim() ?? null;
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
