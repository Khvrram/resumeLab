import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  Code,
  DownloadSimple,
  FileText,
  FloppyDisk,
  ListChecks,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  TextT,
  type Icon,
} from "@phosphor-icons/react";
import {
  paginateResumeSections,
  parseResumePreviewFromLatex,
  parseResumePreviewFromText,
  renderKhurramsResumeLatex,
  renderKhurramsResumePreviewLatex,
  renderKhurramsResumePreviewText,
  renderKhurramsResumeText,
  type ResumePreviewBlock,
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

const SourceCodeEditor = lazy(() =>
  import("./SourceCodeEditor").then((module) => ({
    default: module.SourceCodeEditor,
  })),
);

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
type EditorMode = "sections" | ResumeDocumentMode;
type ResumeExportKind = "pdf" | "docx" | "txt" | "tex";

const modeOptions: Array<{
  id: EditorMode;
  label: string;
  icon: Icon;
}> = [
  {
    id: "sections",
    label: "Sections",
    icon: ListChecks,
  },
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
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";

const darkButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";

const lightButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-300";

const compactLightButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-300";

const dangerLightButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 active:translate-y-px";

const sectionIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-300";

const sectionIconDangerButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 active:translate-y-px";

const saveButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:translate-y-px disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500";

const toolbarGroupClass =
  "flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/60 p-1.5";

const toolbarLabelClass =
  "hidden px-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-zinc-500 md:inline";

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
  const [activeEditMode, setActiveEditMode] = useState<EditorMode>("sections");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState(
    document.revisions[0]?.id ?? "",
  );

  useEffect(() => {
    setActivePageIndex(0);
    setSelectedRevisionId(document.revisions[0]?.id ?? "");
  }, [document.id, document.revisions]);

  const preview = useMemo(
    () =>
      activeEditMode === "latex"
        ? parseResumePreviewFromLatex(document.latexContent)
        : parseResumePreviewFromText(document.textContent),
    [activeEditMode, document.latexContent, document.textContent],
  );
  const [firstPageSections, secondPageSections] = paginateResumeSections(
    preview.sections,
  );
  const pages = [firstPageSections, secondPageSections];
  const exportPages = pages.filter((sections) => sections.length > 0);
  const activePageSections = pages[activePageIndex] ?? [];
  const activeSource =
    activeEditMode === "latex" ? document.latexContent : document.textContent;
  const selectedRevision = document.revisions.find(
    (revision) => revision.id === selectedRevisionId,
  );
  const isGeneratedTextCurrent =
    document.textContent === generatedText && document.latexContent === generatedLatex;

  const exportText = async () => {
    await saveTextArtifact({
      contents: document.textContent,
      fileName: createResumeFileName(profile, "txt"),
      kind: "txt",
      label: "TXT",
      mimeType: "text/plain",
    });
  };

  const exportLatex = async () => {
    await saveTextArtifact({
      contents: document.latexContent,
      fileName: createResumeFileName(profile, "tex"),
      kind: "tex",
      label: "LaTeX",
      mimeType: "application/x-tex",
    });
  };

  const exportPdf = async () => {
    await saveBinaryArtifact({
      contents: createResumePdfBytes(preview, exportPages),
      fileName: createResumeFileName(profile, "pdf"),
      kind: "pdf",
      label: "PDF",
      mimeType: "application/pdf",
    });
  };

  const exportDocx = async () => {
    await saveBinaryArtifact({
      contents: createResumeDocxBytes(preview, exportPages),
      fileName: createResumeFileName(profile, "docx"),
      kind: "docx",
      label: "DOCX",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  const saveTextArtifact = async ({
    contents,
    fileName,
    kind,
    label,
    mimeType,
  }: {
    contents: string;
    fileName: string;
    kind: ResumeExportKind;
    label: string;
    mimeType: string;
  }) => {
    await saveArtifact({
      fallback: () => downloadTextFile(fileName, contents, mimeType),
      label,
      request: {
        defaultFileName: fileName,
        kind,
        textContent: contents,
      },
    });
  };

  const saveBinaryArtifact = async ({
    contents,
    fileName,
    kind,
    label,
    mimeType,
  }: {
    contents: Uint8Array;
    fileName: string;
    kind: ResumeExportKind;
    label: string;
    mimeType: string;
  }) => {
    await saveArtifact({
      fallback: () => downloadBinaryFile(fileName, contents, mimeType),
      label,
      request: {
        contentBase64: bytesToBase64(contents),
        defaultFileName: fileName,
        kind,
      },
    });
  };

  const saveArtifact = async ({
    fallback,
    label,
    request,
  }: {
    fallback: () => void;
    label: string;
    request: Parameters<
      NonNullable<NonNullable<Window["resumelab"]>["files"]>["saveResumeArtifact"]
    >[0];
  }) => {
    setExportError(null);
    setExportStatus(null);
    setIsExportMenuOpen(false);

    const saveResumeArtifact = window.resumelab?.files?.saveResumeArtifact;

    try {
      if (saveResumeArtifact) {
        const result = await saveResumeArtifact(request);

        setExportStatus(
          result.canceled
            ? `${label} export canceled.`
            : `${label} saved to ${result.filePath}.`,
        );
        return;
      }

      fallback();
      setExportStatus(`${label} downloaded through the browser preview.`);
    } catch (error) {
      setExportError(formatExportError(error));
    }
  };

  const goToPreviousPage = () => {
    setActivePageIndex((current) => Math.max(0, current - 1));
  };

  const goToNextPage = () => {
    setActivePageIndex((current) => Math.min(pages.length - 1, current + 1));
  };

  const selectEditMode = (mode: EditorMode) => {
    setActiveEditMode(mode);

    if (mode === "text" || mode === "latex") {
      onChange({ mode });
    }
  };

  const updateStructuredPreview = (nextPreview: ResumePreviewDocument) => {
    onChange({
      mode: "text",
      textContent: renderKhurramsResumePreviewText(nextPreview),
      latexContent: renderKhurramsResumePreviewLatex(nextPreview),
    });
  };

  const updateTextSource = (textContent: string) => {
    const nextPreview = parseResumePreviewFromText(textContent);

    onChange({
      mode: "text",
      textContent,
      latexContent: renderKhurramsResumePreviewLatex(nextPreview),
    });
  };

  const updateLatexSource = (latexContent: string) => {
    const nextPreview = parseResumePreviewFromLatex(latexContent);

    onChange({
      mode: "latex",
      latexContent,
      textContent: renderKhurramsResumePreviewText(nextPreview),
    });
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

        <div className="grid gap-2 xl:justify-items-end">
          <div className={toolbarGroupClass}>
            <span className={toolbarLabelClass}>Edit</span>
            <div
              aria-label="Editor mode"
              className="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-zinc-950 p-1"
              role="tablist"
            >
              {modeOptions.map((option) => {
                const IconComponent = option.icon;
                const isActive = option.id === activeEditMode;

                return (
                  <button
                    aria-selected={isActive}
                    className={`inline-flex h-8 min-w-20 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition active:translate-y-px ${
                      isActive
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}
                    key={option.id}
                    onClick={() => selectEditMode(option.id)}
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
          </div>

          <div className={toolbarGroupClass}>
            <span className={toolbarLabelClass}>Draft</span>
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
              onClick={onRefreshFromFacts}
              type="button"
            >
              <ArrowClockwise size={16} />
              Regenerate
            </button>
            <button
              className={secondaryButtonClass}
              onClick={onCheckpoint}
              type="button"
            >
              <ClockCounterClockwise size={16} />
              Checkpoint
            </button>

            <div className="relative">
              <button
                aria-expanded={isExportMenuOpen}
                className={secondaryButtonClass}
                onClick={() => setIsExportMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <DownloadSimple size={16} />
                Export
                <CaretDown size={14} />
              </button>

              {isExportMenuOpen ? (
                <div className="absolute right-0 top-11 z-20 grid min-w-44 gap-1 rounded-lg border border-white/10 bg-zinc-950 p-1.5 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.95)]">
                  <ExportMenuButton label="PDF" onClick={exportPdf} />
                  <ExportMenuButton label="DOCX" onClick={exportDocx} />
                  <ExportMenuButton label="TXT" onClick={exportText} />
                  <ExportMenuButton label="LaTeX" onClick={exportLatex} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {exportStatus ? (
        <div
          className="border-b border-emerald-300/20 bg-emerald-200/10 px-4 py-2 text-sm text-emerald-100"
          role="status"
        >
          {exportStatus}
        </div>
      ) : null}

      {exportError ? (
        <div
          className="border-b border-red-300/25 bg-red-200/10 px-4 py-2 text-sm text-red-100"
          role="alert"
        >
          {exportError}
        </div>
      ) : null}

      <div className="grid min-w-0 xl:min-h-[calc(100dvh-15.75rem)] xl:grid-cols-[minmax(25rem,0.9fr)_minmax(42rem,1.1fr)]">
        <section
          className={`min-w-0 border-b border-white/10 bg-[#fbfaf7] text-zinc-950 xl:grid xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:border-b-0 xl:border-r xl:border-white/10 ${
            activePane === "source" ? "grid" : "hidden xl:grid"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {activeEditMode === "sections"
                  ? "Structured sections"
                  : activeEditMode === "latex"
                    ? "LaTeX source"
                    : "Text source"}
              </p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-500">
              {activeEditMode === "sections"
                ? `${preview.sections.length} sections`
                : `${activeSource.split(/\r?\n/).length} lines`}
            </span>
          </div>
          {activeEditMode === "sections" ? (
            <StructuredResumeEditor
              onChange={updateStructuredPreview}
              preview={preview}
            />
          ) : (
            <Suspense fallback={<SourceEditorLoadingState />}>
              <SourceCodeEditor
                ariaLabel={
                  activeEditMode === "latex"
                    ? "LaTeX resume source"
                    : "Text resume source"
                }
                className="xl:min-h-[calc(100dvh-20.5rem)]"
                language={activeEditMode === "latex" ? "latex" : "text"}
                onChange={(event) =>
                  activeEditMode === "latex"
                    ? updateLatexSource(event)
                    : updateTextSource(event)
                }
                value={activeSource}
              />
            </Suspense>
          )}

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

function StructuredResumeEditor({
  onChange,
  preview,
}: {
  onChange: (preview: ResumePreviewDocument) => void;
  preview: ResumePreviewDocument;
}) {
  const [expandedSectionIndex, setExpandedSectionIndex] = useState(0);

  useEffect(() => {
    if (preview.sections.length === 0) {
      setExpandedSectionIndex(0);
      return;
    }

    setExpandedSectionIndex((current) =>
      Math.min(current, preview.sections.length - 1),
    );
  }, [preview.sections.length]);

  const updateHeader = (
    patch: Partial<Pick<ResumePreviewDocument, "contact" | "name" | "subtitle">>,
  ) => {
    onChange({ ...preview, ...patch });
  };

  const updateSections = (sections: ResumePreviewSection[]) => {
    onChange({ ...preview, sections });
  };

  const updateSection = (
    sectionIndex: number,
    updater: (section: ResumePreviewSection) => ResumePreviewSection,
  ) => {
    updateSections(
      preview.sections.map((section, index) =>
        index === sectionIndex ? updater(section) : section,
      ),
    );
  };

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    const nextIndex = sectionIndex + direction;

    if (nextIndex < 0 || nextIndex >= preview.sections.length) {
      return;
    }

    const sections = [...preview.sections];
    const [section] = sections.splice(sectionIndex, 1);
    sections.splice(nextIndex, 0, section);
    updateSections(sections);
    setExpandedSectionIndex((current) => {
      if (current === sectionIndex) {
        return nextIndex;
      }

      if (current === nextIndex) {
        return sectionIndex;
      }

      return current;
    });
  };

  const removeSection = (sectionIndex: number) => {
    updateSections(preview.sections.filter((_, index) => index !== sectionIndex));
    setExpandedSectionIndex((current) =>
      current > sectionIndex ? current - 1 : Math.min(current, sectionIndex - 1),
    );
  };

  const addSection = () => {
    updateSections([
      ...preview.sections,
      {
        title: "Additional",
        blocks: [{ heading: "New item", meta: "", bullets: [""] }],
      },
    ]);
    setExpandedSectionIndex(preview.sections.length);
  };

  const updateBlock = (
    sectionIndex: number,
    blockIndex: number,
    patch: Partial<ResumePreviewBlock>,
  ) => {
    updateSection(sectionIndex, (section) => ({
      ...section,
      blocks: section.blocks.map((block, index) =>
        index === blockIndex ? { ...block, ...patch } : block,
      ),
    }));
  };

  const addBlock = (sectionIndex: number) => {
    updateSection(sectionIndex, (section) => ({
      ...section,
      blocks: [...section.blocks, { heading: "New item", meta: "", bullets: [""] }],
    }));
  };

  const removeBlock = (sectionIndex: number, blockIndex: number) => {
    updateSection(sectionIndex, (section) => ({
      ...section,
      blocks: section.blocks.filter((_, index) => index !== blockIndex),
    }));
  };

  return (
    <div className="min-h-[28rem] space-y-3 overflow-auto bg-[#f7f6f2] p-3 xl:max-h-[calc(100dvh-20.5rem)]">
      <details className="group rounded-md border border-zinc-200 bg-white shadow-[0_14px_35px_-32px_rgba(24,24,27,0.7)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-950">Resume header</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {preview.name || "Unnamed resume"} /{" "}
              {preview.contact || "No contact line"}
            </p>
          </div>
          <CaretDown
            className="shrink-0 text-zinc-500 transition group-open:rotate-180"
            size={16}
          />
        </summary>
        <div className="grid gap-3 border-t border-zinc-200 p-3 sm:grid-cols-2">
          <StructuredInput
            label="Name"
            onChange={(name) => updateHeader({ name })}
            value={preview.name}
          />
          <StructuredInput
            label="Subtitle"
            onChange={(subtitle) => updateHeader({ subtitle })}
            value={preview.subtitle}
          />
          <label className="grid gap-2 text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700">Contact line</span>
            <textarea
              className="min-h-16 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
              onChange={(event) => updateHeader({ contact: event.target.value })}
              value={preview.contact}
            />
          </label>
        </div>
      </details>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">Resume sections</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Edit the shared structure used by text, LaTeX, PDF, and DOCX.
          </p>
        </div>
        <button className={lightButtonClass} onClick={addSection} type="button">
          <Plus size={16} />
          Add section
        </button>
      </div>

      {preview.sections.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-zinc-950">
            No sections in this draft
          </p>
          <button className={`${lightButtonClass} mt-3`} onClick={addSection} type="button">
            <Plus size={16} />
            Add first section
          </button>
        </div>
      ) : null}

      {preview.sections.map((section, sectionIndex) => {
        const isExpanded = sectionIndex === expandedSectionIndex;
        const sectionTitle = formatSectionTitle(section);

        return (
          <article
            className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-[0_14px_30px_-28px_rgba(24,24,27,0.55)]"
            key={`${section.title}-${sectionIndex}`}
          >
            <div
              className={`grid gap-2 border-b border-zinc-200 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                isExpanded ? "bg-white" : "bg-zinc-50"
              }`}
            >
              {isExpanded ? (
                <label className="grid min-w-0 gap-1.5 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Section
                  </span>
                  <input
                    aria-label="Section title"
                    className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
                    onChange={(event) =>
                      updateSection(sectionIndex, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    value={section.title}
                  />
                </label>
              ) : (
                <button
                  className="grid min-h-10 min-w-0 content-center rounded-md px-1 text-left transition hover:text-zinc-700 active:translate-y-px"
                  onClick={() => setExpandedSectionIndex(sectionIndex)}
                  type="button"
                >
                  <span className="truncate text-sm font-semibold text-zinc-950">
                    {sectionTitle}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatBlockCount(section.blocks.length)}
                  </span>
                </button>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 sm:inline-flex">
                  {formatBlockCount(section.blocks.length)}
                </span>
                <button
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${sectionTitle}`}
                  className={sectionIconButtonClass}
                  onClick={() =>
                    setExpandedSectionIndex(isExpanded ? -1 : sectionIndex)
                  }
                  title={isExpanded ? "Collapse section" : "Edit section"}
                  type="button"
                >
                  <CaretDown
                    className={`transition ${isExpanded ? "rotate-180" : ""}`}
                    size={15}
                  />
                </button>
                <button
                  aria-label={`Move ${sectionTitle} up`}
                  className={sectionIconButtonClass}
                  disabled={sectionIndex === 0}
                  onClick={() => moveSection(sectionIndex, -1)}
                  title="Move up"
                  type="button"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  aria-label={`Move ${sectionTitle} down`}
                  className={sectionIconButtonClass}
                  disabled={sectionIndex === preview.sections.length - 1}
                  onClick={() => moveSection(sectionIndex, 1)}
                  title="Move down"
                  type="button"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  aria-label={`Remove ${sectionTitle}`}
                  className={sectionIconDangerButtonClass}
                  onClick={() => removeSection(sectionIndex)}
                  title="Remove section"
                  type="button"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="grid gap-3 p-3">
                {section.blocks.map((block, blockIndex) => {
                  const isSimpleBlock =
                    isSimpleTextSection(section.title) &&
                    !block.meta &&
                    block.bullets.length === 0;

                  return (
                    <div
                      className="grid gap-3 rounded-md border border-zinc-200 bg-[#fbfaf7] p-3"
                      key={`${block.heading}-${blockIndex}`}
                    >
                      {isSimpleBlock ? (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <label className="grid gap-2 text-sm">
                            <span className="font-medium text-zinc-700">
                              {getSimpleLineLabel(section.title)}
                            </span>
                            <textarea
                              className="min-h-20 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
                              onChange={(event) =>
                                updateBlock(sectionIndex, blockIndex, {
                                  bullets: [],
                                  heading: event.target.value,
                                  meta: "",
                                })
                              }
                              value={block.heading}
                            />
                          </label>
                          <button
                            className={dangerLightButtonClass}
                            onClick={() => removeBlock(sectionIndex, blockIndex)}
                            type="button"
                          >
                            <Trash size={14} />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto] sm:items-end">
                            <StructuredInput
                              label="Heading"
                              onChange={(heading) =>
                                updateBlock(sectionIndex, blockIndex, { heading })
                              }
                              value={block.heading}
                            />
                            <StructuredInput
                              label="Meta"
                              onChange={(meta) =>
                                updateBlock(sectionIndex, blockIndex, { meta })
                              }
                              value={block.meta}
                            />
                            <button
                              className={dangerLightButtonClass}
                              onClick={() => removeBlock(sectionIndex, blockIndex)}
                              type="button"
                            >
                              <Trash size={14} />
                              Remove
                            </button>
                          </div>
                          <label className="grid gap-2 text-sm">
                            <span className="font-medium text-zinc-700">
                              Bullets, one per line
                            </span>
                            <textarea
                              className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
                              onChange={(event) =>
                                updateBlock(sectionIndex, blockIndex, {
                                  bullets: textToLines(event.target.value),
                                })
                              }
                              value={block.bullets.join("\n")}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  );
                })}

                <button
                  className={compactLightButtonClass}
                  onClick={() => addBlock(sectionIndex)}
                  type="button"
                >
                  <Plus size={14} />
                  Add item
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function formatSectionTitle(section: ResumePreviewSection) {
  return section.title.trim() || "Untitled section";
}

function formatBlockCount(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function isSimpleTextSection(title: string) {
  return /summary|skills/i.test(title);
}

function getSimpleLineLabel(sectionTitle: string) {
  return /summary/i.test(sectionTitle) ? "Summary text" : "Line";
}

function StructuredInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
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

function ExportMenuButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 items-center justify-start gap-2 rounded-md px-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white active:translate-y-px"
      onClick={onClick}
      type="button"
    >
      <DownloadSimple className="text-zinc-500" size={16} />
      {label}
    </button>
  );
}

function SourceEditorLoadingState() {
  return (
    <div className="min-h-[28rem] animate-pulse bg-[#f3f1ec] xl:min-h-[calc(100dvh-20.5rem)]" />
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

function bytesToBase64(contents: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < contents.length; index += chunkSize) {
    binary += String.fromCharCode(...contents.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
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

function formatExportError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Resume export failed. Try another destination.";
}

function formatRevisionCount(count: number) {
  return `${count} saved ${count === 1 ? "checkpoint" : "checkpoints"}`;
}

function textToLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}


