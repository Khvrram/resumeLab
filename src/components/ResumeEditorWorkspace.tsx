import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Gauge,
  Palette,
  WarningCircle,
} from "@phosphor-icons/react";
import { buildResumeDraft } from "../domain/resumeDraft";
import { createSampleV2Workspace } from "../domain/v2";
import { createV2Repository } from "../storage/v2Repository";
import { LiveResumeEditor } from "./LiveResumeEditor";
import {
  createSampleProfile,
  type ResumeProfile,
} from "./profileTypes";
import { loadProfileFromRepository } from "./profileRepositoryAdapter";
import type { JobApplication, V2WorkspaceState } from "../domain/v2";

const v2Repository = createV2Repository();

const toolbarSelectClass =
  "h-10 min-w-0 rounded-md border border-white/15 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/10";

export function ResumeEditorWorkspace() {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [workspace, setWorkspace] = useState<V2WorkspaceState | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedProfile, loadedWorkspace] = await Promise.all([
          loadProfileFromRepository(),
          v2Repository.load(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(loadedProfile ?? createSampleProfile());
        setWorkspace(loadedWorkspace);
        setActiveJobId(loadedWorkspace.jobApplications[0]?.id ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const fallbackWorkspace = createSampleV2Workspace();
        setProfile(createSampleProfile());
        setWorkspace(fallbackWorkspace);
        setActiveJobId(fallbackWorkspace.jobApplications[0]?.id ?? null);
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
  }, []);

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

  const draft = useMemo(() => {
    if (!profile) {
      return null;
    }

    return buildResumeDraft(profile, {
      jobDescription: activeJob?.jobDescription ?? "",
    });
  }, [activeJob?.jobDescription, profile]);

  if (isLoading || !profile || !workspace || !draft) {
    return <EditorLoadingState />;
  }

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-[1720px] gap-4 px-4 py-4 sm:px-6">
        <section className="grid gap-3 rounded-xl border border-white/10 bg-zinc-900/80 p-3 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.9)] lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <EditorSignal
              icon={FileText}
              label="Template"
              value="KhurramsResume"
            />
            <EditorSignal
              icon={Gauge}
              label="Local match"
              value={`${draft.match.score}/100`}
            />
            <EditorSignal
              icon={Palette}
              label="Pages"
              value="2-page CV"
            />
          </div>

          <div className="grid gap-2 sm:min-w-[23rem]">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                Target
              </span>
              <select
                className={toolbarSelectClass}
                onChange={(event) => setActiveJobId(event.target.value)}
                value={activeJob?.id ?? ""}
              >
                {workspace.jobApplications.map((job) => (
                  <option key={job.id} value={job.id}>
                    {formatJobLabel(job)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {errorMessage ? (
          <div
            className="flex gap-3 rounded-lg border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-100"
            role="alert"
          >
            <WarningCircle className="shrink-0" size={19} />
            <div>
              <p className="font-semibold">Storage attention</p>
              <p className="mt-1 leading-6">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <LiveResumeEditor draft={draft} profile={profile} />
      </div>
    </main>
  );
}

function EditorSignal({
  icon: IconComponent,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-zinc-200">
        <IconComponent size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function EditorLoadingState() {
  return (
    <main className="min-h-[calc(100dvh-73px)] bg-zinc-950 p-4 sm:p-6">
      <div className="mx-auto grid max-w-[1720px] gap-4">
        <div className="h-20 animate-pulse rounded-xl bg-white/10" />
        <div className="h-[calc(100dvh-12rem)] min-h-[42rem] animate-pulse rounded-xl bg-white/10" />
      </div>
    </main>
  );
}

function formatJobLabel(job: JobApplication) {
  return (
    [job.roleTitle, job.company].filter(Boolean).join(" at ") || "Target job"
  );
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected editor error occurred.";
}
