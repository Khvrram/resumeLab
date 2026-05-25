import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  Code,
  DownloadSimple,
  FileText,
  FloppyDisk,
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
import {
  createResumeDocxBytes,
  createResumePdfBytes,
} from "../domain/resumeExports";
import { createResumeFileName, type ResumeDraft } from "../domain/resumeDraft";
import {
  type ResumeDocument,
  type ResumeDocumentContentPatch,
  type ResumeDocumentMode,
} from "../domain/resumeDocuments";
import type { ResumeProfile } from "./profileTypes";

type LiveResumeEditorProps = {
  document: ResumeDocument;
  draft: ResumeDraft;
  isDirty: boolean;
  onChange: (patch: ResumeDocumentContentPatch) => void;
  onCheckpoint: () => void;
  onRefreshFromFacts: () => void;
  onRestoreRevision: (revisionId: string) => void;
  onSave: () => void;
  profile: ResumeProfile;
  saveState: "idle" | "saving" | "saved" | "error";
};

type EditorPane = "source" | "preview";

const modeOptions: Array<{
  id: ResumeDocumentMode;
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
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/10 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

const darkButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/10 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

const lightButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

const saveButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 active:translate-y-px disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500";

export function LiveResumeEditor({
  document,
  draft,
  isDirty,
  onChange,
  onCheckpoint,
  onRefreshFromFacts,
  onRestoreRevision,
  onSave,
  profile,
  saveState,
}: LiveResumeEditorProps) {
  const generatedText = useMemo(() => renderKhurramsResumeText(draft), [draft]);
  const generatedLatex = useMemo(() => renderKhurramsResumeLatex(draft), [draft]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activePane, setActivePane] = useState<EditorPane>("source");
  const [selectedRevisionId, setSelectedRevisionId] = useState(
    document.revisions[0]?.id ?? "",
  );

  useEffect(() => {
    setActivePageIndex(0);
    setSelectedRevisionId(document.revisions[0]?.id ?? "");
  }, [document.id, document.revisions]);

  const preview = useMemo(
    () =>
      document.mode === "latex"
        ? parseResumePreviewFromLatex(document.latexContent)
        : parseResumePreviewFromText(document.textContent),
    [document.latexContent, document.mode, document.textContent],
  );
  const [firstPageSections, secondPageSections] = paginateResumeSections(
    preview.sections,
  );
  const pages = [firstPageSections, secondPageSections];
  const exportPages = pages.filter((sections) => sections.length > 0);
  const activePageSections = pages[activePageIndex] ?? [];
  const activeSource =
    document.mode === "latex" ? document.latexContent : document.textContent;
  const editorClass =
    document.mode === "latex"
      ? "min-h-[32rem] w-full resize-none bg-[#111114] px-4 py-4 font-mono text-xs leading-5 text-zinc-100 outline-none placeholder:text-zinc-500 xl:min-h-[calc(100dvh-20.5rem)]"
      : "min-h-[32rem] w-full resize-none bg-[#fbfaf7] px-4 py-4 font-mono text-sm leading-6 text-zinc-950 outline-none placeholder:text-zinc-400 xl:min-h-[calc(100dvh-20.5rem)]";
  const selectedRevision = document.revisions.find(
    (revision) => revision.id === selectedRevisionId,
  );
  const isGeneratedTextCurrent =
    document.textContent === generatedText && document.latexContent === generatedLatex;

  const exportText = () => {
    downloadTextFile(
      createResumeFileName(profile, "txt"),
      document.textContent,
      "text/plain",
    );
  };

  const exportLatex = () => {
    downloadTextFile(
      createResumeFileName(profile, "tex"),
      document.latexContent,
      "application/x-tex",
    );
  };

  const exportPdf = () => {
    downloadBinaryFile(
      createResumeFileName(profile, "pdf"),
      createResumePdfBytes(preview, exportPages),
      "application/pdf",
    );
  };

  const exportDocx = () => {
    downloadBinaryFile(
      createResumeFileName(profile, "docx"),
      createResumeDocxBytes(preview, exportPages),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  };

  const goToPreviousPage = () => {
    setActivePageIndex((current) => Math.max(0, current - 1));
  };

  const goToNextPage = () => {
    setActivePageIndex((current) => Math.min(pages.length - 1, current + 1));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111114] shadow-[0_34px_90px_-55px_rgba(0,0,0,0.95)]">
      <div className="grid gap-3 border-b border-white/10 bg-[#18181b] px-3 py-3 xl:grid-cols-[1fr_auto] xl:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            KhurramsResume
          </p>
          <h3 className="mt-1 text-xl font-semibold text-white">
            Live editor
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {isDirty ? "Unsaved draft edits" : "Saved draft"} /{" "}
            {isGeneratedTextCurrent ? "Generated from current facts" : "Manual edits active"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <div
            aria-label="Editor mode"
            className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-zinc-950 p-1"
            role="tablist"
          >
            {modeOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = option.id === document.mode;

              return (
                <button
                  aria-selected={isActive}
                  className={`inline-flex h-8 min-w-20 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition active:translate-y-px ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                  key={option.id}
                  onClick={() => onChange({ mode: option.id })}
                  role="tab"
                  type="button"
                >
                  <IconComponent size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>
          <div
            aria-label="Editor pane"
            className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-zinc-950 p-1 xl:hidden"
            role="tablist"
          >
            <PaneButton
              isActive={activePane === "source"}
              label="Source"
              onClick={() => setActivePane("source")}
            />
            <PaneButton
              isActive={activePane === "preview"}
              label="Preview"
              onClick={() => setActivePane("preview")}
            />
          </div>
          <button
            className={secondaryButtonClass}
            onClick={onRefreshFromFacts}
            type="button"
          >
            <ArrowClockwise size={16} />
            Regenerate
          </button>
          <button className={secondaryButtonClass} onClick={onCheckpoint} type="button">
            <ClockCounterClockwise size={16} />
            Checkpoint
          </button>
          <button
            className={saveButtonClass}
            disabled={!isDirty || saveState === "saving"}
            onClick={onSave}
            type="button"
          >
            {saveState === "saving" ? (
              <ArrowClockwise className="animate-spin" size={16} />
            ) : (
              <FloppyDisk size={16} />
            )}
            Save
          </button>
          <button
            className={secondaryButtonClass}
            onClick={exportPdf}
            type="button"
          >
            <DownloadSimple size={16} />
            PDF
          </button>
          <button
            className={secondaryButtonClass}
            onClick={exportDocx}
            type="button"
          >
            <DownloadSimple size={16} />
            DOCX
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

      <div className="grid min-w-0 xl:min-h-[calc(100dvh-15.75rem)] xl:grid-cols-[minmax(25rem,0.9fr)_minmax(42rem,1.1fr)]">
        <section
          className={`min-w-0 border-b border-white/10 bg-[#fbfaf7] text-zinc-950 xl:grid xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:border-b-0 xl:border-r xl:border-white/10 ${
            activePane === "source" ? "grid" : "hidden xl:grid"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {document.mode === "latex" ? "LaTeX source" : "Text source"}
              </p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-500">
              {activeSource.split(/\r?\n/).length} lines
            </span>
          </div>
          <textarea
            className={editorClass}
            onChange={(event) =>
              document.mode === "latex"
                ? onChange({ latexContent: event.target.value })
                : onChange({ textContent: event.target.value })
            }
            spellCheck={document.mode === "text"}
            value={activeSource}
          />

          <div className="grid gap-3 border-t border-zinc-200 bg-white px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Revision history
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatRevisionCount(document.revisions.length)} for this draft.
                </p>
              </div>
              <button
                className={lightButtonClass}
                disabled={!selectedRevision}
                onClick={() =>
                  selectedRevision && onRestoreRevision(selectedRevision.id)
                }
                type="button"
              >
                Restore
              </button>
            </div>
            <select
              className="h-10 min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
              disabled={document.revisions.length === 0}
              onChange={(event) => setSelectedRevisionId(event.target.value)}
              value={selectedRevisionId}
            >
              {document.revisions.map((revision) => (
                <option key={revision.id} value={revision.id}>
                  {revision.label} / {formatRevisionDate(revision.createdAt)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section
          className={`min-w-0 bg-[#0c0c0e] text-white xl:grid xl:grid-rows-[auto_minmax(0,1fr)] ${
            activePane === "preview" ? "grid" : "hidden xl:grid"
          }`}
        >
          <div className="grid gap-3 border-b border-white/10 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <div>
                <p className="text-sm font-semibold">Current resume</p>
                <p className="text-xs text-zinc-400">Letter preview</p>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                {pages.map((_, index) => {
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

          <div className="min-h-[34rem] overflow-auto bg-[#101012] p-3 sm:p-5 xl:max-h-[calc(100dvh-20.5rem)]">
            <ResumePage
              document={preview}
              pageNumber={activePageIndex + 1}
              sections={activePageSections}
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function PaneButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={isActive}
      className={`inline-flex h-8 min-w-20 items-center justify-center rounded-md px-2.5 text-xs font-medium transition active:translate-y-px ${
        isActive
          ? "bg-white text-zinc-950 shadow-sm"
          : "text-zinc-400 hover:bg-white/10 hover:text-white"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
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
    <article className="mx-auto aspect-[8.5/11] w-full max-w-[52rem] overflow-hidden break-words rounded-[3px] bg-white p-[5.6%] text-[0.46rem] leading-[1.28] text-zinc-950 shadow-[0_35px_80px_-45px_rgba(0,0,0,0.85)] ring-1 ring-zinc-300 [overflow-wrap:anywhere] sm:text-[0.72rem] 2xl:text-[0.82rem]">
      <header className="border-b border-zinc-900 pb-2 text-center">
        <h4 className="text-[1.52em] font-semibold uppercase tracking-[0.065em]">
          {document.name || "Resume"}
        </h4>
        {document.subtitle ? (
          <p className="mt-1 text-[0.88em] text-zinc-700">{document.subtitle}</p>
        ) : null}
        {document.contact ? (
          <p className="mt-1 text-[0.8em] text-zinc-600 [overflow-wrap:anywhere]">
            {document.contact}
          </p>
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
                {section.blocks.map((block, index) => {
                  const isStandaloneLine =
                    !block.meta &&
                    block.bullets.length === 0 &&
                    /summary|skills/i.test(section.title);

                  return (
                    <div key={`${block.heading}-${index}`}>
                      {block.heading ? (
                        isStandaloneLine ? (
                          <p className="[overflow-wrap:anywhere]">
                            {block.heading}
                          </p>
                        ) : (
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
                        )
                      ) : null}
                      {block.bullets.length > 0 ? (
                        <ul className="mt-0.5 list-disc space-y-[0.12rem] pl-4">
                          {block.bullets
                            .slice(0, 9)
                            .map((bullet, bulletIndex) => (
                              <li
                                className="[overflow-wrap:anywhere]"
                                key={`${bullet}-${bulletIndex}`}
                              >
                                {bullet}
                              </li>
                            ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
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

function downloadTextFile(fileName: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  downloadBlob(fileName, blob);
}

function downloadBinaryFile(
  fileName: string,
  contents: Uint8Array,
  type: string,
) {
  const buffer = new ArrayBuffer(contents.byteLength);
  new Uint8Array(buffer).set(contents);
  const blob = new Blob([buffer], { type });
  downloadBlob(fileName, blob);
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRevisionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown time";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRevisionCount(count: number) {
  return `${count} saved ${count === 1 ? "checkpoint" : "checkpoints"}`;
}
