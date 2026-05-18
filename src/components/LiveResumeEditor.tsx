import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Code,
  DownloadSimple,
  Eye,
  FileText,
  TextT,
} from "@phosphor-icons/react";
import {
  paginateResumeSections,
  parseResumePreviewFromLatex,
  parseResumePreviewFromText,
  renderKhurramsResumeLatex,
  renderKhurramsResumeText,
  type ResumePreviewDocument,
  type ResumePreviewSection,
} from "../domain/khurramsResumeTemplate";
import { createResumeFileName, type ResumeDraft } from "../domain/resumeDraft";
import type { ResumeProfile } from "./profileTypes";

type EditorMode = "text" | "latex";

type LiveResumeEditorProps = {
  draft: ResumeDraft;
  profile: ResumeProfile;
};

const editorStorageKey = "resumelab.khurramsresume.editor.v1";

const modeOptions: Array<{
  id: EditorMode;
  label: string;
  icon: typeof TextT;
}> = [
  {
    id: "text",
    label: "Text",
    icon: TextT,
  },
  {
    id: "latex",
    label: "LaTeX",
    icon: Code,
  },
];

const editorClass =
  "min-h-[44rem] w-full resize-y rounded-md border border-zinc-300 bg-zinc-950 px-4 py-3 font-mono text-xs leading-5 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

const secondaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

export function LiveResumeEditor({ draft, profile }: LiveResumeEditorProps) {
  const generatedText = useMemo(() => renderKhurramsResumeText(draft), [draft]);
  const generatedLatex = useMemo(() => renderKhurramsResumeLatex(draft), [draft]);
  const [mode, setMode] = useState<EditorMode>("text");
  const [textBuffer, setTextBuffer] = useState(generatedText);
  const [latexBuffer, setLatexBuffer] = useState(generatedLatex);
  const [hasLoadedStoredEditor, setHasLoadedStoredEditor] = useState(false);

  useEffect(() => {
    const storedEditor = window.localStorage.getItem(editorStorageKey);

    if (storedEditor) {
      try {
        const parsedEditor: unknown = JSON.parse(storedEditor);

        if (isStoredEditor(parsedEditor)) {
          setMode(parsedEditor.mode);
          setTextBuffer(parsedEditor.text);
          setLatexBuffer(parsedEditor.latex);
        }
      } catch {
        setTextBuffer(generatedText);
        setLatexBuffer(generatedLatex);
      }
    }

    setHasLoadedStoredEditor(true);
  }, [generatedLatex, generatedText]);

  useEffect(() => {
    if (!hasLoadedStoredEditor) {
      return;
    }

    window.localStorage.setItem(
      editorStorageKey,
      JSON.stringify({
        mode,
        text: textBuffer,
        latex: latexBuffer,
      }),
    );
  }, [hasLoadedStoredEditor, latexBuffer, mode, textBuffer]);

  const preview = useMemo(
    () =>
      mode === "latex"
        ? parseResumePreviewFromLatex(latexBuffer)
        : parseResumePreviewFromText(textBuffer),
    [latexBuffer, mode, textBuffer],
  );
  const activeSource = mode === "latex" ? latexBuffer : textBuffer;
  const [firstPageSections, secondPageSections] = paginateResumeSections(
    preview.sections,
  );

  const resetFromFacts = () => {
    setTextBuffer(generatedText);
    setLatexBuffer(generatedLatex);
  };

  const exportText = () => {
    downloadTextFile(
      createResumeFileName(profile, "txt"),
      textBuffer,
      "text/plain",
    );
  };

  const exportLatex = () => {
    downloadTextFile(
      createResumeFileName(profile, "tex"),
      latexBuffer,
      "application/x-tex",
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            <Eye size={15} />
            KhurramsResume
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
            Live two-page resume editor
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <div
            aria-label="Editor mode"
            className="grid grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1"
            role="tablist"
          >
            {modeOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = option.id === mode;

              return (
                <button
                  aria-selected={isActive}
                  className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition active:translate-y-px ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                  key={option.id}
                  onClick={() => setMode(option.id)}
                  role="tab"
                  type="button"
                >
                  <IconComponent size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            className={secondaryButtonClass}
            onClick={resetFromFacts}
            type="button"
          >
            <ArrowClockwise size={16} />
            Reset
          </button>
          <button className={secondaryButtonClass} onClick={exportText} type="button">
            <DownloadSimple size={16} />
            TXT
          </button>
          <button
            className={secondaryButtonClass}
            onClick={exportLatex}
            type="button"
          >
            <DownloadSimple size={16} />
            LaTeX
          </button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.82fr)_minmax(38rem,1.18fr)]">
        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium text-zinc-700">
            {mode === "latex" ? "Editable LaTeX source" : "Editable resume text"}
          </span>
          <textarea
            className={editorClass}
            onChange={(event) =>
              mode === "latex"
                ? setLatexBuffer(event.target.value)
                : setTextBuffer(event.target.value)
            }
            value={activeSource}
          />
        </label>

        <div className="min-w-0 rounded-md border border-zinc-200 bg-zinc-100 p-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <FileText size={17} />
              Current resume preview
            </div>
            <span className="font-mono text-xs text-zinc-500">
              2 pages / letter
            </span>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ResumePage
              document={preview}
              pageNumber={1}
              sections={firstPageSections}
            />
            <ResumePage
              document={preview}
              pageNumber={2}
              sections={secondPageSections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumePage({
  document,
  pageNumber,
  sections,
}: {
  document: ResumePreviewDocument;
  pageNumber: number;
  sections: ResumePreviewSection[];
}) {
  return (
    <article className="mx-auto aspect-[8.5/11] w-full max-w-[38rem] overflow-hidden rounded-sm bg-white p-[5.8%] text-[0.52rem] leading-[1.24] text-zinc-950 shadow-[0_18px_55px_-35px_rgba(24,24,27,0.5)] ring-1 ring-zinc-200 sm:text-[0.64rem]">
      <header className="border-b border-zinc-900 pb-2 text-center">
        <h4 className="text-[1.38em] font-semibold uppercase tracking-[0.06em]">
          {document.name || "Resume"}
        </h4>
        {document.subtitle ? (
          <p className="mt-1 text-[0.86em] text-zinc-700">{document.subtitle}</p>
        ) : null}
        {document.contact ? (
          <p className="mt-1 text-[0.78em] text-zinc-600">{document.contact}</p>
        ) : null}
      </header>

      <div className="mt-3 grid gap-2">
        {sections.length > 0 ? (
          sections.map((section) => (
            <section key={`${pageNumber}-${section.title}`}>
              <h5 className="border-b border-zinc-800 pb-0.5 text-[0.9em] font-bold uppercase tracking-[0.08em]">
                {section.title}
              </h5>
              <div className="mt-1 grid gap-1.5">
                {section.blocks.map((block, index) => (
                  <div key={`${block.heading}-${index}`}>
                    {block.heading ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate font-semibold">
                          {block.heading}
                        </p>
                        {block.meta ? (
                          <p className="shrink-0 text-[0.85em] font-semibold">
                            {block.meta}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {block.bullets.length > 0 ? (
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                        {block.bullets.slice(0, 8).map((bullet, bulletIndex) => (
                          <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="flex h-full items-center justify-center border border-dashed border-zinc-300 text-center text-zinc-500">
            Page {pageNumber}
          </div>
        )}
      </div>
    </article>
  );
}

function isStoredEditor(
  value: unknown,
): value is { mode: EditorMode; text: string; latex: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    (record.mode === "text" || record.mode === "latex") &&
    typeof record.text === "string" &&
    typeof record.latex === "string"
  );
}

function downloadTextFile(fileName: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
