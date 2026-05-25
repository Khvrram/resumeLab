import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  Briefcase,
  CheckCircle,
  Database,
  DownloadSimple,
  FileText,
  FloppyDisk,
  LockKey,
  ShieldCheck,
  Stack,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  buildAiEgressPreview,
  buildResumeDraft,
  renderResumePlainText,
} from "../domain/resumeDraft";
import {
  createJobApplication,
  refreshJobApplicationSignals,
} from "../domain/v2Actions";
import { createV2Repository } from "../storage/v2Repository";
import {
  countVisibility,
  createEmptySkillGroup,
  createSampleProfile,
  type ResumeProfile,
} from "./profileTypes";
import {
  loadProfileFromRepository,
  saveProfileToRepository,
} from "./profileRepositoryAdapter";
import { createSampleV2Workspace } from "../domain/v2";
import type { JobApplication, V2WorkspaceState } from "../domain/v2";

type StudioSaveState = "idle" | "saving" | "saved" | "error";

type ResumeStudioWorkspaceProps = {
  onOpenEditor: () => void;
  onOpenLibrary: () => void;
  onOpenProfile: () => void;
  onSelectJob: (jobId: string | null) => void;
  selectedJobId: string | null;
};

const v2Repository = createV2Repository();

const inputClass =
  "min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

const textareaClass =
  "min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

const primaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400";

const secondaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

export function ResumeStudioWorkspace({
  onOpenEditor,
  onOpenLibrary,
  onOpenProfile,
  onSelectJob,
  selectedJobId,
}: ResumeStudioWorkspaceProps) {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [workspace, setWorkspace] = useState<V2WorkspaceState | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<StudioSaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialSelectedJobId = useRef(selectedJobId);

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
        const initialJobId = initialSelectedJobId.current;
        const nextActiveJobId =
          initialJobId &&
          loadedWorkspace.jobApplications.some((job) => job.id === initialJobId)
            ? initialJobId
            : loadedWorkspace.jobApplications[0]?.id ?? null;
        setActiveJobId(nextActiveJobId);
        onSelectJob(nextActiveJobId);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const fallbackWorkspace = createSampleV2Workspace();
        setProfile(createSampleProfile());
        setWorkspace(fallbackWorkspace);
        const fallbackActiveJobId =
          fallbackWorkspace.jobApplications[0]?.id ?? null;
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

  useEffect(() => {
    if (
      workspace &&
      selectedJobId &&
      selectedJobId !== activeJobId &&
      workspace.jobApplications.some((job) => job.id === selectedJobId)
    ) {
      setActiveJobId(selectedJobId);
    }
  }, [activeJobId, selectedJobId, workspace]);

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

  const plainText = useMemo(
    () => (draft ? renderResumePlainText(draft) : ""),
    [draft],
  );
  const egressPreview = useMemo(
    () =>
      profile
        ? buildAiEgressPreview(profile, activeJob?.jobDescription ?? "")
        : "",
    [activeJob?.jobDescription, profile],
  );
  const visibilityCounts = useMemo(
    () => (profile ? countVisibility(profile) : null),
    [profile],
  );

  const updateProfile = (updater: (profile: ResumeProfile) => ResumeProfile) => {
    setProfile((current) => {
      if (!current) {
        return current;
      }

      return {
        ...updater(current),
        updatedAt: new Date().toISOString(),
      };
    });
    markDirty();
  };

  const updateActiveJob = (updater: (job: JobApplication) => JobApplication) => {
    if (!activeJob) {
      return;
    }

    setWorkspace((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        updatedAt: new Date().toISOString(),
        jobApplications: current.jobApplications.map((job) =>
          job.id === activeJob.id ? updater(job) : job,
        ),
      };
    });
    markDirty();
  };

  const addTargetJob = () => {
    const job = createJobApplication({
      roleTitle: "Target role",
      company: "Target company",
    });

    setWorkspace((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        updatedAt: new Date().toISOString(),
        jobApplications: [job, ...current.jobApplications],
      };
    });
    setActiveJobId(job.id);
    onSelectJob(job.id);
    markDirty();
  };

  const analyzeActiveJob = () => {
    updateActiveJob((job) => refreshJobApplicationSignals(job));
  };

  const saveStudio = async () => {
    if (!profile || !workspace) {
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const [savedProfile] = await Promise.all([
        saveProfileToRepository(profile),
        v2Repository.save(workspace),
      ]);

      setProfile(savedProfile);
      setIsDirty(false);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(formatError(error));
    }
  };

  const markDirty = () => {
    setIsDirty(true);
    setSaveState("idle");
  };

  const openEditor = async () => {
    if (isDirty) {
      await saveStudio();
    }

    onOpenEditor();
  };

  if (isLoading || !profile || !workspace || !draft) {
    return <StudioLoadingState />;
  }

  const matchScore = draft.match.score;
  const eligibleFacts =
    (visibilityCounts?.eligible ?? 0) +
    profile.experience.reduce(
      (count, entry) =>
        entry.visibility === "eligible"
          ? count + entry.bullets.filter(Boolean).length
          : count,
      0,
    ) +
    profile.projects.reduce(
      (count, entry) =>
        entry.visibility === "eligible"
          ? count + entry.bullets.filter(Boolean).length
          : count,
      0,
    );

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-[#f7f7f4] text-zinc-950">
      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[18rem_minmax(0,1fr)_23rem]">
        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-white shadow-[0_18px_45px_-30px_rgba(24,24,27,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                  ResumeLab
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  Tailoring Studio
                </h1>
              </div>
              <StatusPill label={isDirty ? "Unsaved" : "Saved"} />
            </div>
            <div className="mt-5 grid gap-2">
              <FlowStep
                detail={`${eligibleFacts} usable facts`}
                icon={Database}
                isActive
                label="Profile"
              />
              <FlowStep
                detail={activeJob ? activeJob.company : "No target"}
                icon={Briefcase}
                isActive={Boolean(activeJob?.jobDescription.trim())}
                label="Target"
              />
              <FlowStep
                detail={`${matchScore}/100 local match`}
                icon={FileText}
                isActive={matchScore > 0}
                label="Draft"
              />
              <FlowStep
                detail="TXT and LaTeX"
                icon={DownloadSimple}
                isActive={plainText.length > 0}
                label="Export"
              />
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="grid gap-2">
              <button
                className={secondaryButtonClass}
                onClick={() => void openEditor()}
                type="button"
              >
                <FileText size={17} />
                Resume editor
              </button>
              <button
                className={secondaryButtonClass}
                onClick={onOpenProfile}
                type="button"
              >
                <Database size={17} />
                Full profile editor
              </button>
              <button
                className={secondaryButtonClass}
                onClick={onOpenLibrary}
                type="button"
              >
                <Stack size={17} />
                Templates and models
              </button>
            </div>
          </section>
        </aside>

        <section className="grid min-w-0 content-start gap-5">
          {errorMessage ? (
            <Notice tone="error" title="Storage attention">
              {errorMessage}
            </Notice>
          ) : null}

          <section className="rounded-lg border border-zinc-200 bg-white shadow-[0_18px_45px_-35px_rgba(24,24,27,0.35)]">
            <div className="grid gap-4 border-b border-zinc-200 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Target job
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
                  {activeJob?.roleTitle || "No target selected"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={secondaryButtonClass}
                  onClick={addTargetJob}
                  type="button"
                >
                  <Briefcase size={17} />
                  New target
                </button>
                <button
                  className={primaryButtonClass}
                  disabled={!activeJob?.jobDescription.trim()}
                  onClick={analyzeActiveJob}
                  type="button"
                >
                  <CheckCircle size={17} />
                  Analyze
                </button>
              </div>
            </div>

            {activeJob ? (
              <div className="grid gap-4 p-4 lg:grid-cols-3">
                <TextInput
                  label="Role"
                  onChange={(roleTitle) =>
                    updateActiveJob((job) => ({ ...job, roleTitle }))
                  }
                  value={activeJob.roleTitle}
                />
                <TextInput
                  label="Company"
                  onChange={(company) =>
                    updateActiveJob((job) => ({ ...job, company }))
                  }
                  value={activeJob.company}
                />
                <TextInput
                  label="Source"
                  onChange={(url) =>
                    updateActiveJob((job) => ({
                      ...job,
                      source: {
                        ...job.source,
                        url,
                      },
                    }))
                  }
                  value={activeJob.source.url ?? ""}
                />
                <label className="grid gap-2 text-sm lg:col-span-3">
                  <span className="font-medium text-zinc-700">
                    Job description
                  </span>
                  <textarea
                    className={`${textareaClass} min-h-48`}
                    onChange={(event) =>
                      updateActiveJob((job) => ({
                        ...job,
                        jobDescription: event.target.value,
                      }))
                    }
                    value={activeJob.jobDescription}
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white">
            <div className="grid gap-4 border-b border-zinc-200 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Profile core
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  Approved source facts
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <SignalMetric
                  label="Matched"
                  value={draft.match.matchedTools.length}
                />
                <SignalMetric
                  label="Missing"
                  value={draft.match.missingKeywords.length}
                />
                <SignalMetric label="Sections" value={draft.sections.length} />
              </div>
            </div>
            <div className="grid gap-4 p-4 xl:grid-cols-4">
              <TextInput
                label="Name"
                onChange={(fullName) =>
                  updateProfile((current) => ({
                    ...current,
                    basics: { ...current.basics, fullName },
                  }))
                }
                value={profile.basics.fullName}
              />
              <TextInput
                label="Headline"
                onChange={(headline) =>
                  updateProfile((current) => ({
                    ...current,
                    basics: { ...current.basics, headline },
                  }))
                }
                value={profile.basics.headline}
              />
              <TextInput
                label="Location"
                onChange={(location) =>
                  updateProfile((current) => ({
                    ...current,
                    basics: { ...current.basics, location },
                  }))
                }
                value={profile.basics.location}
              />
              <TextInput
                label="Email"
                onChange={(email) =>
                  updateProfile((current) => ({
                    ...current,
                    basics: { ...current.basics, email },
                  }))
                }
                value={profile.basics.email}
              />
              <label className="grid gap-2 text-sm xl:col-span-2">
                <span className="font-medium text-zinc-700">Summary</span>
                <textarea
                  className={`${textareaClass} min-h-24`}
                  onChange={(event) =>
                    updateProfile((current) => ({
                      ...current,
                      basics: {
                        ...current.basics,
                        summary: event.target.value,
                      },
                    }))
                  }
                  value={profile.basics.summary}
                />
              </label>
              <div className="xl:col-span-2">
                <SkillsEditor profile={profile} updateProfile={updateProfile} />
              </div>
            </div>
          </section>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Truth gate
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {visibilityCounts?.private ?? 0} private and{" "}
                  {visibilityCounts?.excluded ?? 0} excluded records stay out.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-4">
              <div className="flex items-center gap-2">
                <LockKey size={18} />
                <h2 className="text-sm font-semibold">AI egress preview</h2>
              </div>
            </div>
            <div className="p-4">
              <textarea
                className={`${textareaClass} min-h-[24rem] font-mono text-xs leading-5`}
                readOnly
                value={egressPreview}
              />
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="grid gap-3">
              <button
                className={primaryButtonClass}
                disabled={!isDirty || saveState === "saving"}
                onClick={() => void saveStudio()}
                type="button"
              >
                {saveState === "saving" ? (
                  <ArrowClockwise className="animate-spin" size={17} />
                ) : (
                  <FloppyDisk size={17} />
                )}
                Save workspace
              </button>
              <p className="text-xs leading-5 text-zinc-500">
                {saveState === "saved"
                  ? "Saved locally."
                  : "Profile and target records use local storage."}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function SkillsEditor({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const firstGroup = profile.skills[0] ?? createEmptySkillGroup();

  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-zinc-700">Primary skills</span>
      <input
        className={inputClass}
        onChange={(event) => {
          const skills = event.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

          updateProfile((current) => ({
            ...current,
            skills:
              current.skills.length === 0
                ? [{ ...firstGroup, category: "Core", skills }]
                : current.skills.map((group, index) =>
                    index === 0 ? { ...group, skills } : group,
                  ),
          }));
        }}
        value={firstGroup.skills.join(", ")}
      />
    </label>
  );
}

function TextInput({
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
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function FlowStep({
  detail,
  icon: IconComponent,
  isActive,
  label,
}: {
  detail: string;
  icon: typeof Database;
  isActive: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border p-3 ${
        isActive
          ? "border-white/15 bg-white/10"
          : "border-zinc-800 bg-zinc-900/70"
      }`}
    >
      <IconComponent className="shrink-0" size={18} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}

function SignalMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-zinc-200">
      {label}
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
  tone: "error";
}) {
  return (
    <div
      className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
      role={tone === "error" ? "alert" : "status"}
    >
      <WarningCircle className="shrink-0" size={19} />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{children}</p>
      </div>
    </div>
  );
}

function StudioLoadingState() {
  return (
    <main className="min-h-[calc(100dvh-73px)] bg-[#f7f7f4] p-5">
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_23rem]">
        <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-[38rem] animate-pulse rounded-lg bg-white" />
        <div className="h-96 animate-pulse rounded-lg bg-zinc-200" />
      </div>
    </main>
  );
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected studio error occurred.";
}
