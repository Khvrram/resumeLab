import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  ClockCounterClockwise,
  Gauge,
  Palette,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import { buildResumeDraft } from "../domain/resumeDraft";
import {
  createResumeDocument,
  createResumeRevision,
  findDocumentForJob,
  refreshResumeDocumentFromDraft,
  restoreResumeRevision,
  updateResumeDocumentContent,
  type ResumeDocument,
  type ResumeDocumentContentPatch,
} from "../domain/resumeDocuments";
import { createSampleV2Workspace } from "../domain/v2";
import { createResumeDocumentRepository } from "../storage/resumeDocumentRepository";
import { createV2Repository } from "../storage/v2Repository";
import { LiveResumeEditor } from "./LiveResumeEditor";
import {
  createSampleProfile,
  type ResumeProfile,
} from "./profileTypes";
import { loadProfileFromRepository } from "./profileRepositoryAdapter";
import type { JobApplication, V2WorkspaceState } from "../domain/v2";

type EditorSaveState = "idle" | "saving" | "saved" | "error";

type ResumeEditorWorkspaceProps = {
  onSelectJob: (jobId: string | null) => void;
  selectedJobId: string | null;
};

const documentRepository = createResumeDocumentRepository();
const v2Repository = createV2Repository();

const toolbarSelectClass =
  "h-10 min-w-0 rounded-md border border-white/15 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/10";

export function ResumeEditorWorkspace({
  onSelectJob,
  selectedJobId,
}: ResumeEditorWorkspaceProps) {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [workspace, setWorkspace] = useState<V2WorkspaceState | null>(null);
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(selectedJobId);
  const [isLoading, setIsLoading] = useState(true);
  const [isDocumentDirty, setIsDocumentDirty] = useState(false);
  const [saveState, setSaveState] = useState<EditorSaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initialSelectedJobId = useRef(selectedJobId);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedProfile, loadedWorkspace, loadedDocuments] =
          await Promise.all([
            loadProfileFromRepository(),
            v2Repository.load(),
            documentRepository.load(),
          ]);

        if (!isMounted) {
          return;
        }

        const nextProfile = loadedProfile ?? createSampleProfile();
        const nextActiveJobId = resolveActiveJobId(
          loadedWorkspace,
          initialSelectedJobId.current,
        );
        const ensuredDocuments = await ensureDocumentForJob({
          documents: loadedDocuments,
          jobId: nextActiveJobId,
          profile: nextProfile,
          workspace: loadedWorkspace,
        });

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setWorkspace(loadedWorkspace);
        setDocuments(ensuredDocuments);
        setActiveJobId(nextActiveJobId);
        onSelectJob(nextActiveJobId);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const fallbackProfile = createSampleProfile();
        const fallbackWorkspace = createSampleV2Workspace();
        const fallbackActiveJobId =
          fallbackWorkspace.jobApplications[0]?.id ?? null;
        const fallbackDocuments = await ensureDocumentForJob({
          documents: [],
          jobId: fallbackActiveJobId,
          persist: false,
          profile: fallbackProfile,
          workspace: fallbackWorkspace,
        });

        if (!isMounted) {
          return;
        }

        setProfile(fallbackProfile);
        setWorkspace(fallbackWorkspace);
        setDocuments(fallbackDocuments);
        setActiveJobId(fallbackActiveJobId);
        onSelectJob(fallbackActiveJobId);
        setErrorMessage(formatError(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [onSelectJob]);

  const activeJob = useMemo(() => {
    if (!workspace) {
      return null;
    }

    return (
      workspace.jobApplications.find((job) => job.id === activeJobId) ??
      workspace.jobApplications[0] ??
      null
    );
  }, [activeJobId, workspace]);

  const activeDocument = useMemo(
    () => findDocumentForJob(documents, activeJob?.id ?? null),
    [activeJob?.id, documents],
  );

  const draft = useMemo(() => {
    if (!profile) {
      return null;
    }

    return buildResumeDraft(profile, {
      jobDescription: activeJob?.jobDescription ?? "",
    });
  }, [activeJob?.jobDescription, profile]);

  const updateActiveDocument = (patch: ResumeDocumentContentPatch) => {
    if (!activeDocument) {
      return;
    }

    const nextDocument = updateResumeDocumentContent(activeDocument, patch);
    replaceDocument(nextDocument);
    setIsDocumentDirty(true);
    setSaveState("idle");
    setNotice(null);
  };

  const saveActiveDocument = async () => {
    if (!activeDocument) {
      return;
    }

    await persistDocument(activeDocument, "Saved resume draft locally.");
    setIsDocumentDirty(false);
  };

  const checkpointActiveDocument = async () => {
    if (!activeDocument) {
      return;
    }

    const checkpointedDocument = createResumeRevision(
      activeDocument,
      "Manual checkpoint",
    );

    replaceDocument(checkpointedDocument);
    await persistDocument(checkpointedDocument, "Saved a draft checkpoint.");
    setIsDocumentDirty(false);
  };

  const refreshActiveDocument = () => {
    if (!activeDocument || !draft || !profile) {
      return;
    }

    const refreshedDocument = refreshResumeDocumentFromDraft(
      activeDocument,
      draft,
      profile,
    );

    replaceDocument(refreshedDocument);
    setIsDocumentDirty(true);
    setSaveState("idle");
    setNotice("Regenerated this draft from current profile and target facts.");
  };

  const restoreRevision = (revisionId: string) => {
    if (!activeDocument) {
      return;
    }

    const restoredDocument = restoreResumeRevision(activeDocument, revisionId);

    replaceDocument(restoredDocument);
    setIsDocumentDirty(true);
    setSaveState("idle");
    setNotice("Restored revision into the editor. Save to keep it.");
  };

  const selectJob = async (jobId: string) => {
    if (!workspace || !profile) {
      return;
    }

    if (isDocumentDirty) {
      await saveActiveDocument();
    }

    const ensuredDocuments = await ensureDocumentForJob({
      documents,
      jobId,
      profile,
      workspace,
    });

    setDocuments(ensuredDocuments);
    setActiveJobId(jobId);
    onSelectJob(jobId);
    setIsDocumentDirty(false);
    setSaveState("idle");
    setNotice("Opened the draft for the selected target.");
  };

  const replaceDocument = (nextDocument: ResumeDocument) => {
    setDocuments((currentDocuments) =>
      currentDocuments.some((document) => document.id === nextDocument.id)
        ? currentDocuments.map((document) =>
            document.id === nextDocument.id ? nextDocument : document,
          )
        : [nextDocument, ...currentDocuments],
    );
  };

  const persistDocument = async (document: ResumeDocument, message: string) => {
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const savedDocuments = await documentRepository.upsert(document);
      setDocuments(savedDocuments);
      setSaveState("saved");
      setNotice(message);
    } catch (error) {
      setSaveState("error");
      setErrorMessage(formatError(error));
    }
  };

  if (isLoading || !profile || !workspace || !draft || !activeDocument) {
    return <EditorLoadingState />;
  }

  const isStale = activeDocument.sourceProfileUpdatedAt !== profile.updatedAt;

  return (
    <main className="min-h-[calc(100dvh-65px)] bg-[#0d0d0f] text-white">
      <div className="mx-auto grid max-w-[1720px] gap-3 px-3 py-3 sm:px-5">
        <section className="grid gap-4 rounded-lg border border-white/10 bg-[#161619] px-4 py-3 shadow-[0_22px_70px_-48px_rgba(0,0,0,0.95)] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                KhurramsResume
              </span>
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  isDocumentDirty
                    ? "border-amber-300/25 bg-amber-200/10 text-amber-100"
                    : "border-emerald-300/20 bg-emerald-200/10 text-emerald-100"
                }`}
              >
                {isDocumentDirty ? "Unsaved edits" : "Saved locally"}
              </span>
            </div>
            <h1 className="mt-3 max-w-5xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
              {activeDocument.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
              <EditorFact icon={Gauge} value={formatCoverage(draft.match.score)} />
              <EditorFact icon={Palette} value="ATS template" />
              <EditorFact
                icon={ClockCounterClockwise}
                value={formatRevisionCount(activeDocument.revisions.length)}
              />
            </div>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Target job
            </span>
            <select
              className={toolbarSelectClass}
              onChange={(event) => void selectJob(event.target.value)}
              value={activeJob?.id ?? ""}
            >
              {workspace.jobApplications.map((job) => (
                <option key={job.id} value={job.id}>
                  {formatJobLabel(job)}
                </option>
              ))}
            </select>
          </label>
        </section>

        {isStale ? (
          <div
            className="flex gap-3 rounded-lg border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-100"
            role="status"
          >
            <ArrowClockwise className="shrink-0" size={19} />
            <div className="min-w-0">
              <p className="font-semibold">Draft facts changed upstream</p>
              <p className="mt-1 leading-6">
                The saved document was generated from an older profile snapshot.
                Use Regenerate to checkpoint this draft and rebuild it from current
                facts.
              </p>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <Notice title="Storage attention" tone="error">
            {errorMessage}
          </Notice>
        ) : null}

        {notice && !errorMessage ? (
          <Notice title="Draft status" tone="info">
            {notice}
          </Notice>
        ) : null}

        <LiveResumeEditor
          document={activeDocument}
          draft={draft}
          isDirty={isDocumentDirty}
          onChange={updateActiveDocument}
          onCheckpoint={() => void checkpointActiveDocument()}
          onRefreshFromFacts={refreshActiveDocument}
          onRestoreRevision={restoreRevision}
          onSave={() => void saveActiveDocument()}
          profile={profile}
          saveState={saveState}
        />
      </div>
    </main>
  );
}

function EditorFact({
  icon: IconComponent,
  value,
}: {
  icon: Icon;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
      <IconComponent className="shrink-0 text-zinc-500" size={15} />
      <span className="truncate">{value}</span>
    </span>
  );
}

function Notice({
  children,
  title,
  tone,
}: {
  children: string;
  title: string;
  tone: "error" | "info";
}) {
  const isError = tone === "error";

  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 text-sm ${
        isError
          ? "border-red-300/30 bg-red-200/10 text-red-100"
          : "border-white/10 bg-white/[0.03] text-zinc-200"
      }`}
      role={isError ? "alert" : "status"}
    >
      <WarningCircle className="shrink-0" size={19} />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{children}</p>
      </div>
    </div>
  );
}

function EditorLoadingState() {
  return (
    <main className="min-h-[calc(100dvh-65px)] bg-[#0d0d0f] p-4 sm:p-6">
      <div className="mx-auto grid max-w-[1720px] gap-4">
        <div className="h-24 animate-pulse rounded-lg bg-white/10" />
        <div className="h-[calc(100dvh-12rem)] min-h-[42rem] animate-pulse rounded-lg bg-white/10" />
      </div>
    </main>
  );
}

async function ensureDocumentForJob({
  documents,
  jobId,
  persist = true,
  profile,
  workspace,
}: {
  documents: ResumeDocument[];
  jobId: string | null;
  persist?: boolean;
  profile: ResumeProfile;
  workspace: V2WorkspaceState;
}) {
  const existingDocument = findDocumentForJob(documents, jobId);

  if (existingDocument?.jobApplicationId === jobId) {
    return documents;
  }

  const job = workspace.jobApplications.find((item) => item.id === jobId) ?? null;
  const draft = buildResumeDraft(profile, {
    jobDescription: job?.jobDescription ?? "",
  });
  const document = createResumeDocument({
    draft,
    jobApplicationId: jobId,
    profile,
    title: job ? `${job.roleTitle} at ${job.company}` : undefined,
  });

  if (!persist) {
    return [document, ...documents];
  }

  return documentRepository.upsert(document);
}

function resolveActiveJobId(
  workspace: V2WorkspaceState,
  selectedJobId: string | null,
) {
  if (
    selectedJobId &&
    workspace.jobApplications.some((job) => job.id === selectedJobId)
  ) {
    return selectedJobId;
  }

  return workspace.jobApplications[0]?.id ?? null;
}

function formatJobLabel(job: JobApplication) {
  return (
    [job.roleTitle, job.company].filter(Boolean).join(" at ") || "Target job"
  );
}

function formatCoverage(score: number) {
  if (score >= 70) {
    return "Strong coverage";
  }

  if (score >= 40) {
    return "Some gaps";
  }

  return "Needs review";
}

function formatRevisionCount(count: number) {
  return `${count} ${count === 1 ? "checkpoint" : "checkpoints"}`;
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected editor error occurred.";
}
