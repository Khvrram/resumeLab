import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  Code,
  DownloadSimple,
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

const secondaryButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

const darkButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/15 active:translate-y-px";

export function LiveResumeEditor({ draft, profile }: LiveResumeEditorProps) {
  const generatedText = useMemo(() => renderKhurramsResumeText(draft), [draft]);
  const generatedLatex = useMemo(() => renderKhurramsResumeLatex(draft), [draft]);
  const [mode, setMode] = useState<EditorMode>("text");
  const [textBuffer, setTextBuffer] = useState(generatedText);
  const [latexBuffer, setLatexBuffer] = useState(generatedLatex);
  const [activePageIndex, setActivePageIndex] = useState(0);
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
  const [firstPageSections, secondPageSections] = paginateResumeSections(
    preview.sections,
  );
  const pages = [firstPageSections, secondPageSections];
  const activePageSections = pages[activePageIndex] ?? [];
  const activeSource = mode === "latex" ? latexBuffer : textBuffer;
  const editorClass =
    mode === "latex"
      ? "min-h-[39rem] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-xs leading-5 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
      : "min-h-[39rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

  const resetFromFacts = () => {
    setTextBuffer(generatedText);
    setLatexBuffer(generatedLatex);
    setActivePageIndex(0);
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

  const goToPreviousPage = () => {
    setActivePageIndex((current) => Math.max(0, current - 1));
  };

  const goToNextPage = () => {
    setActivePageIndex((current) => Math.min(pages.length - 1, current + 1));
  };

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_22px_55px_-38px_rgba(24,24,27,0.5)]">
      <div className="grid gap-4 border-b border-zinc-200 bg-white p-4 xl:grid-cols-[1fr_auto] xl:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            KhurramsResume
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
            Live source and resume preview
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
                  className={`inline-flex h-8 min-w-20 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition active:translate-y-px ${
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

      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(22rem,0.72fr)_minmax(34rem,1fr)]">
        <div className="grid min-w-0 content-start gap-3 border-b border-zinc-200 bg-zinc-50 p-4 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {mode === "latex" ? "LaTeX source" : "Resume text"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Changes update the preview as you type.
              </p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-500">
              {activeSource.split(/\r?\n/).length} lines
            </span>
          </div>
          <textarea
            className={editorClass}
            onChange={(event) =>
              mode === "latex"
                ? setLatexBuffer(event.target.value)
                : setTextBuffer(event.target.value)
            }
            spellCheck={mode === "text"}
            value={activeSource}
          />
        </div>

        <div className="min-w-0 bg-zinc-950 p-4 text-white">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <div>
                <p className="text-sm font-semibold">Current resume</p>
                <p className="text-xs text-zinc-400">Letter page preview</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className={darkButtonClass}
                disabled={activePageIndex === 0}
                onClick={goToPreviousPage}
                type="button"
              >
                <CaretLeft size={15} />
                Previous
              </button>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-white/10 p-1">
                {pages.map((sections, index) => {
                  const isActive = index === activePageIndex;

                  return (
                    <button
                      className={`h-8 rounded-md px-3 text-xs font-medium transition active:translate-y-px ${
                        isActive
                          ? "bg-white text-zinc-950"
                          : "text-zinc-300 hover:bg-white/10"
                      }`}
                      key={index}
                      onClick={() => setActivePageIndex(index)}
                      type="button"
                    >
                      Page {index + 1}
                      <span className="ml-1 font-mono text-[0.68rem] opacity-70">
                        {sections.length}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                className={darkButtonClass}
                disabled={activePageIndex === pages.length - 1}
                onClick={goToNextPage}
                type="button"
              >
                Next
                <CaretRight size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-[74rem] overflow-auto rounded-lg bg-zinc-900/70 p-3 ring-1 ring-white/10">
            <ResumePage
              document={preview}
              pageNumber={activePageIndex + 1}
              sections={activePageSections}
            />
          </div>
        </div>
      </div>
    </section>
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
    <article className="mx-auto aspect-[8.5/11] w-full max-w-[48rem] overflow-hidden rounded-[3px] bg-white p-[5.6%] text-[0.62rem] leading-[1.28] text-zinc-950 shadow-[0_35px_80px_-45px_rgba(0,0,0,0.85)] ring-1 ring-zinc-300 sm:text-[0.72rem] 2xl:text-[0.78rem]">
      <header className="border-b border-zinc-900 pb-2 text-center">
        <h4 className="text-[1.52em] font-semibold uppercase tracking-[0.065em]">
          {document.name || "Resume"}
        </h4>
        {document.subtitle ? (
          <p className="mt-1 text-[0.88em] text-zinc-700">{document.subtitle}</p>
        ) : null}
        {document.contact ? (
          <p className="mt-1 text-[0.8em] text-zinc-600">{document.contact}</p>
        ) : null}
      </header>

      <div className="mt-3 grid gap-2.5">
        {sections.length > 0 ? (
          sections.map((section) => (
            <section key={`${pageNumber}-${section.title}`}>
              <h5 className="border-b border-zinc-800 pb-0.5 text-[0.92em] font-bold uppercase tracking-[0.08em]">
                {section.title}
              </h5>
              <div className="mt-1.5 grid gap-1.5">
                {section.blocks.map((block, index) => (
                  <div key={`${block.heading}-${index}`}>
                    {block.heading ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate font-semibold">
                          {block.heading}
                        </p>
                        {block.meta ? (
                          <p className="shrink-0 text-[0.84em] font-semibold">
                            {block.meta}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {block.bullets.length > 0 ? (
                      <ul className="mt-0.5 list-disc space-y-[0.12rem] pl-4">
                        {block.bullets.slice(0, 9).map((bullet, bulletIndex) => (
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
