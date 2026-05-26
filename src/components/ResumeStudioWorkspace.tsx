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
import { buildResumeDraft, renderResumePlainText } from "../domain/resumeDraft";
import {
  buildTailoringPrompt,
  applyAiProposalReviewChanges,
  createAiProposalReviewChanges,
  createTailoringProposal,
  hashAiText,
  type AiProviderConfig,
  type AiProposalReviewChange,
  type AiTailoringProposal,
} from "../domain/aiTailoring";
import {
  createResumeDocument,
  createResumeRevision,
  findDocumentForJob,
  updateResumeDocumentContent,
} from "../domain/resumeDocuments";
import {
  createJobApplication,
  refreshJobApplicationSignals,
} from "../domain/v2Actions";
import { createAiSettingsRepository } from "../storage/aiSettingsRepository";
import { createResumeDocumentRepository } from "../storage/resumeDocumentRepository";
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
type AiRunState = "idle" | "saving-key" | "generating" | "applying" | "error";
type AiReviewDecision = "accepted" | "rejected";

type ResumeStudioWorkspaceProps = {
  onOpenEditor: () => void;
  onOpenLibrary: () => void;
  onOpenProfile: () => void;
  onSelectJob: (jobId: string | null) => void;
  selectedJobId: string | null;
};

const v2Repository = createV2Repository();
const aiSettingsRepository = createAiSettingsRepository();
const resumeDocumentRepository = createResumeDocumentRepository();

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
  const [aiConfigs, setAiConfigs] = useState<AiProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("provider_openai");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [aiRunState, setAiRunState] = useState<AiRunState>("idle");
  const [aiProposal, setAiProposal] = useState<AiTailoringProposal | null>(null);
  const [approvedEgressFingerprint, setApprovedEgressFingerprint] = useState<
    string | null
  >(null);
  const [aiReviewDecisions, setAiReviewDecisions] = useState<
    Record<string, AiReviewDecision>
  >({});
  const [editedAiChangeTextById, setEditedAiChangeTextById] = useState<
    Record<string, string>
  >({});
  const [
    suggestedAdditionsAcknowledged,
    setSuggestedAdditionsAcknowledged,
  ] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialSelectedJobId = useRef(selectedJobId);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedProfile, loadedWorkspace, loadedAiConfigs] = await Promise.all([
          loadProfileFromRepository(),
          v2Repository.load(),
          aiSettingsRepository.loadProviderConfigs(),
        ]);

        if (!isMounted) {
          return;
        }

        const hydratedAiConfigs = await hydrateProviderSecretStatus(
          loadedAiConfigs,
        );

        if (!isMounted) {
          return;
        }

        setProfile(loadedProfile ?? createSampleProfile());
        setWorkspace(loadedWorkspace);
        setAiConfigs(hydratedAiConfigs);
        setSelectedProviderId(
          hydratedAiConfigs.find((config) => config.enabled)?.id ??
            hydratedAiConfigs[0]?.id ??
            "provider_openai",
        );
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
        const fallbackAiConfigs = await hydrateProviderSecretStatus(
          await aiSettingsRepository.loadProviderConfigs(),
        );
        setAiConfigs(fallbackAiConfigs);
        setSelectedProviderId(fallbackAiConfigs[0]?.id ?? "provider_openai");
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
  const aiResumeText = useMemo(() => {
    if (!draft || !profile) {
      return "";
    }

    return renderResumePlainText({
      ...draft,
      contactLine: profile.privacy.keepContactPrivateByDefault
        ? "[contact details withheld]"
        : draft.contactLine,
    });
  }, [draft, profile]);
  const egressPreview = useMemo(
    () => {
      if (!profile || !activeJob) {
        return "";
      }

      return buildTailoringPrompt({
        job: activeJob,
        resumeText: aiResumeText,
      }).egressPreview;
    },
    [activeJob, aiResumeText, profile],
  );
  const visibilityCounts = useMemo(
    () => (profile ? countVisibility(profile) : null),
    [profile],
  );
  const selectedProvider = useMemo(
    () =>
      aiConfigs.find((config) => config.id === selectedProviderId) ??
      aiConfigs[0] ??
      null,
    [aiConfigs, selectedProviderId],
  );
  const aiEgressFingerprint = useMemo(
    () =>
      hashAiText(
        JSON.stringify({
          activeJobId: activeJob?.id ?? null,
          egressPreview,
          provider: selectedProvider
            ? {
                baseUrl: selectedProvider.baseUrl,
                id: selectedProvider.id,
                model: selectedProvider.model,
                provider: selectedProvider.provider,
              }
            : null,
        }),
      ),
    [activeJob?.id, egressPreview, selectedProvider],
  );
  const hasApprovedCurrentEgress =
    approvedEgressFingerprint === aiEgressFingerprint;
  const aiReviewChanges = useMemo(
    () =>
      aiProposal
        ? createAiProposalReviewChanges({
            originalText: plainText,
            proposal: aiProposal,
          })
        : [],
    [aiProposal, plainText],
  );
  const isAiProposalStale = Boolean(
    aiProposal &&
      (aiProposal.jobApplicationId !== activeJob?.id ||
        aiProposal.sourceResumeHash !== hashAiText(plainText)),
  );
  const reviewedChangeCount = aiReviewChanges.filter(
    (change) => aiReviewDecisions[change.id],
  ).length;
  const acceptedChangeIds = useMemo(
    () =>
      new Set(
        aiReviewChanges
          .filter((change) => aiReviewDecisions[change.id] === "accepted")
          .map((change) => change.id),
      ),
    [aiReviewChanges, aiReviewDecisions],
  );
  const hasAcceptedAiChanges = acceptedChangeIds.size > 0;
  const hasReviewedAllAiChanges =
    aiReviewChanges.length > 0 &&
    reviewedChangeCount === aiReviewChanges.length;
  const hasResolvedUnsupportedSuggestions =
    !aiProposal?.suggestedAdditions.length || suggestedAdditionsAcknowledged;
  const canUseDesktopAi = Boolean(
    window.resumelab?.ai && window.resumelab.secrets,
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

  const updateSelectedProvider = (patch: Partial<AiProviderConfig>) => {
    if (!selectedProvider) {
      return;
    }

    setAiConfigs((current) =>
      current.map((config) =>
        config.id === selectedProvider.id
          ? { ...config, ...patch, updatedAt: new Date().toISOString() }
          : config,
      ),
    );
    setAiRunState("idle");
    setAiMessage("AI provider settings changed. Save them before a run.");
  };

  const saveSelectedProviderSettings = async () => {
    if (!selectedProvider) {
      return;
    }

    setAiRunState("saving-key");
    setAiMessage(null);

    try {
      const saved = await aiSettingsRepository.upsertProviderConfig(
        selectedProvider,
      );
      setAiConfigs(await hydrateProviderSecretStatus(saved));
      setAiRunState("idle");
      setAiMessage("Saved provider metadata locally.");
    } catch (error) {
      setAiRunState("error");
      setAiMessage(formatError(error));
    }
  };

  const saveProviderKey = async () => {
    if (!selectedProvider || !window.resumelab?.secrets) {
      setAiRunState("error");
      setAiMessage("Provider keys can only be saved in the Electron desktop app.");
      return;
    }

    setAiRunState("saving-key");
    setAiMessage(null);

    try {
      await window.resumelab.secrets.setProviderKey(
        selectedProvider.id,
        apiKeyDraft,
      );
      const saved = await aiSettingsRepository.upsertProviderConfig({
        ...selectedProvider,
        hasSecret: true,
      });
      setAiConfigs(await hydrateProviderSecretStatus(saved));
      setApiKeyDraft("");
      setAiRunState("idle");
      setAiMessage("Saved provider key with OS-backed desktop encryption.");
    } catch (error) {
      setAiRunState("error");
      setAiMessage(formatError(error));
    }
  };

  const deleteProviderKey = async () => {
    if (!selectedProvider || !window.resumelab?.secrets) {
      return;
    }

    setAiRunState("saving-key");
    setAiMessage(null);

    try {
      await window.resumelab.secrets.deleteProviderKey(selectedProvider.id);
      const saved = await aiSettingsRepository.upsertProviderConfig({
        ...selectedProvider,
        hasSecret: false,
      });
      setAiConfigs(await hydrateProviderSecretStatus(saved));
      setAiRunState("idle");
      setAiMessage("Removed the saved provider key.");
    } catch (error) {
      setAiRunState("error");
      setAiMessage(formatError(error));
    }
  };

  const approveCurrentEgress = () => {
    setApprovedEgressFingerprint(aiEgressFingerprint);
    setAiMessage("Approved this provider payload. You can generate a proposal.");
  };

  const setAiReviewDecision = (
    change: AiProposalReviewChange,
    decision: AiReviewDecision,
  ) => {
    setAiReviewDecisions((current) => ({
      ...current,
      [change.id]: decision,
    }));

    if (decision === "accepted") {
      setEditedAiChangeTextById((current) => ({
        ...current,
        [change.id]: current[change.id] ?? change.afterLines.join("\n"),
      }));
    }
  };

  const generateAiProposal = async () => {
    if (!activeJob || !selectedProvider) {
      return;
    }

    if (!hasApprovedCurrentEgress) {
      setAiRunState("error");
      setAiMessage("Approve the current egress preview before sending an AI request.");
      return;
    }

    if (!window.resumelab?.ai) {
      setAiRunState("error");
      setAiMessage("AI calls run through the Electron desktop bridge.");
      return;
    }

    const prompt = buildTailoringPrompt({
      job: activeJob,
      resumeText: aiResumeText,
    });

    setAiRunState("generating");
    setAiMessage(null);
    setAiProposal(null);
    setAiReviewDecisions({});
    setEditedAiChangeTextById({});
    setSuggestedAdditionsAcknowledged(false);

    try {
      const response = await window.resumelab.ai.generateTailoringProposal({
        baseUrl: selectedProvider.baseUrl,
        model: selectedProvider.model,
        provider: selectedProvider.provider,
        providerId: selectedProvider.id,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
      });
      const proposal = createTailoringProposal({
        job: activeJob,
        model: selectedProvider.model,
        originalResumeText: plainText,
        provider: selectedProvider.provider,
        response,
      });

      setAiProposal(proposal);
      setAiReviewDecisions({});
      setEditedAiChangeTextById({});
      setSuggestedAdditionsAcknowledged(false);
      setAiRunState("idle");
      setAiMessage("Generated a proposal. Review it before applying.");
    } catch (error) {
      setAiRunState("error");
      setAiMessage(formatError(error));
    }
  };

  const applyAiProposal = async () => {
    if (!aiProposal || !activeJob || !profile || !draft) {
      return;
    }

    if (isAiProposalStale) {
      setAiRunState("error");
      setAiMessage(
        "This proposal is stale because the job or resume facts changed. Generate a fresh proposal.",
      );
      return;
    }

    if (!hasReviewedAllAiChanges) {
      setAiRunState("error");
      setAiMessage("Accept or reject every proposed change before applying.");
      return;
    }

    if (!hasAcceptedAiChanges) {
      setAiRunState("error");
      setAiMessage("Accept at least one proposed change before applying.");
      return;
    }

    if (!hasResolvedUnsupportedSuggestions) {
      setAiRunState("error");
      setAiMessage(
        "Acknowledge the unsupported suggestions before applying approved changes.",
      );
      return;
    }

    setAiRunState("applying");
    setAiMessage(null);

    try {
      const documents = await resumeDocumentRepository.load();
      const existingDocument = findDocumentForJob(documents, activeJob.id);
      const baseDocument =
        existingDocument ??
        createResumeDocument({
          draft,
          jobApplicationId: activeJob.id,
          profile,
          title: `${activeJob.roleTitle} at ${activeJob.company}`,
        });
      const checkpointedDocument = createResumeRevision(
        baseDocument,
        "Before AI proposal",
      );
      const approvedProposalText = applyAiProposalReviewChanges({
        acceptedChangeIds,
        editedAfterTextById: editedAiChangeTextById,
        originalText: plainText,
        reviewChanges: aiReviewChanges,
      });
      const updatedDocument = updateResumeDocumentContent(checkpointedDocument, {
        mode: "text",
        textContent: restoreResumeHeader(approvedProposalText, plainText),
      });

      await resumeDocumentRepository.upsert(updatedDocument);
      onSelectJob(activeJob.id);
      setAiRunState("idle");
      onOpenEditor();
    } catch (error) {
      setAiRunState("error");
      setAiMessage(formatError(error));
    }
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
              <div className="mt-3 grid gap-2">
                <button
                  className={
                    hasApprovedCurrentEgress
                      ? secondaryButtonClass
                      : primaryButtonClass
                  }
                  disabled={!canUseDesktopAi || !selectedProvider}
                  onClick={approveCurrentEgress}
                  type="button"
                >
                  <ShieldCheck size={17} />
                  {hasApprovedCurrentEgress
                    ? "Context approved"
                    : "Approve this context"}
                </button>
                <p className="text-xs leading-5 text-zinc-500">
                  Approval resets whenever the target, provider, model, base URL,
                  or resume context changes.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">AI tailoring</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Provider keys stay in the desktop secret bridge.
                  </p>
                </div>
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    selectedProvider?.hasSecret
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {selectedProvider?.hasSecret ? "Key saved" : "No key"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 p-4">
              {!canUseDesktopAi ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Open the Electron desktop app to save provider keys and run AI
                  calls. Browser preview keeps this disabled.
                </p>
              ) : null}

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-zinc-700">Provider</span>
                <select
                  className={inputClass}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  value={selectedProvider?.id ?? ""}
                >
                  {aiConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProvider ? (
                <>
                  <TextInput
                    label="Model"
                    onChange={(model) => updateSelectedProvider({ model })}
                    value={selectedProvider.model}
                  />
                  <TextInput
                    label="Base URL"
                    onChange={(baseUrl) => updateSelectedProvider({ baseUrl })}
                    value={selectedProvider.baseUrl}
                  />
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium text-zinc-700">API key</span>
                    <input
                      className={inputClass}
                      onChange={(event) => setApiKeyDraft(event.target.value)}
                      placeholder={
                        selectedProvider.hasSecret
                          ? "Saved key is hidden"
                          : "Paste provider key"
                      }
                      type="password"
                      value={apiKeyDraft}
                    />
                  </label>
                </>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  className={secondaryButtonClass}
                  disabled={!selectedProvider || aiRunState === "saving-key"}
                  onClick={() => void saveSelectedProviderSettings()}
                  type="button"
                >
                  Save settings
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={
                    !canUseDesktopAi ||
                    !selectedProvider ||
                    !apiKeyDraft ||
                    aiRunState === "saving-key"
                  }
                  onClick={() => void saveProviderKey()}
                  type="button"
                >
                  Save key
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={!canUseDesktopAi || !selectedProvider?.hasSecret}
                  onClick={() => void deleteProviderKey()}
                  type="button"
                >
                  Clear key
                </button>
              </div>

              <button
                className={primaryButtonClass}
                disabled={
                  !canUseDesktopAi ||
                  !selectedProvider?.hasSecret ||
                  !hasApprovedCurrentEgress ||
                  !activeJob?.jobDescription.trim() ||
                  aiRunState === "generating"
                }
                onClick={() => void generateAiProposal()}
                type="button"
              >
                {aiRunState === "generating" ? (
                  <ArrowClockwise className="animate-spin" size={17} />
                ) : (
                  <CheckCircle size={17} />
                )}
                {hasApprovedCurrentEgress
                  ? "Generate proposal"
                  : "Approve context first"}
              </button>

              {aiMessage ? (
                <p
                  className={`rounded-md border p-3 text-xs leading-5 ${
                    aiRunState === "error"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  {aiMessage}
                </p>
              ) : null}

              {aiProposal ? (
                <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      Review proposal
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {aiProposal.provider} / {aiProposal.model} /{" "}
                      {reviewedChangeCount} of {aiReviewChanges.length} reviewed
                    </p>
                  </div>

                  {isAiProposalStale ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-900">
                      This proposal is stale because the selected job or source
                      resume changed. Generate a fresh proposal before applying.
                    </div>
                  ) : null}

                  {aiReviewChanges.length > 0 ? (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={secondaryButtonClass}
                          onClick={() => {
                            const nextDecisions: Record<string, AiReviewDecision> =
                              {};
                            const nextEdits: Record<string, string> = {};

                            aiReviewChanges.forEach((change) => {
                              nextDecisions[change.id] = "accepted";
                              nextEdits[change.id] = change.afterLines.join("\n");
                            });

                            setAiReviewDecisions(nextDecisions);
                            setEditedAiChangeTextById(nextEdits);
                          }}
                          type="button"
                        >
                          Accept all safe changes
                        </button>
                        <button
                          className={secondaryButtonClass}
                          onClick={() => {
                            const nextDecisions: Record<string, AiReviewDecision> =
                              {};

                            aiReviewChanges.forEach((change) => {
                              nextDecisions[change.id] = "rejected";
                            });

                            setAiReviewDecisions(nextDecisions);
                          }}
                          type="button"
                        >
                          Reject all
                        </button>
                      </div>

                      {aiReviewChanges.map((change) => (
                        <AiReviewChangeCard
                          change={change}
                          decision={aiReviewDecisions[change.id] ?? null}
                          editedAfterText={
                            editedAiChangeTextById[change.id] ??
                            change.afterLines.join("\n")
                          }
                          key={change.id}
                          onDecision={(decision) =>
                            setAiReviewDecision(change, decision)
                          }
                          onEdit={(value) =>
                            setEditedAiChangeTextById((current) => ({
                              ...current,
                              [change.id]: value,
                            }))
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-600">
                      The provider returned no safe resume text changes. Review
                      suggested additions below or regenerate the proposal.
                    </div>
                  )}

                  {aiProposal.suggestedAdditions.length > 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                      <p className="font-semibold">
                        Unsupported suggestions stay out of the resume
                      </p>
                      <p className="mt-1">
                        These items are not applied unless you later add them as
                        user-authored facts.
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {aiProposal.suggestedAdditions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <label className="mt-3 flex items-start gap-2">
                        <input
                          checked={suggestedAdditionsAcknowledged}
                          className="mt-1"
                          onChange={(event) =>
                            setSuggestedAdditionsAcknowledged(
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                        <span>
                          Keep these out of the resume and continue only with
                          approved diff changes.
                        </span>
                      </label>
                    </div>
                  ) : null}

                  <button
                    className={primaryButtonClass}
                    disabled={
                      aiRunState === "applying" ||
                      isAiProposalStale ||
                      !hasReviewedAllAiChanges ||
                      !hasAcceptedAiChanges ||
                      !hasResolvedUnsupportedSuggestions
                    }
                    onClick={() => void applyAiProposal()}
                    type="button"
                  >
                    {aiRunState === "applying"
                      ? "Applying approved changes"
                      : "Apply approved changes"}
                  </button>
                </div>
              ) : null}
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

function AiReviewChangeCard({
  change,
  decision,
  editedAfterText,
  onDecision,
  onEdit,
}: {
  change: AiProposalReviewChange;
  decision: AiReviewDecision | null;
  editedAfterText: string;
  onDecision: (decision: AiReviewDecision) => void;
  onEdit: (value: string) => void;
}) {
  const isAccepted = decision === "accepted";
  const isRejected = decision === "rejected";

  return (
    <article
      className={`grid gap-3 rounded-md border bg-white p-3 ${
        isAccepted
          ? "border-emerald-200"
          : isRejected
            ? "border-zinc-200 opacity-75"
            : "border-amber-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            {change.section} / {formatChangeKind(change.kind)}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {formatReviewLineRange(change)}
          </p>
        </div>
        <span
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            isAccepted
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : isRejected
                ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {isAccepted ? "Accepted" : isRejected ? "Rejected" : "Needs review"}
        </span>
      </div>

      <p className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs leading-5 text-zinc-600">
        {change.rationale}
      </p>

      <div className="grid gap-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Current
          </span>
          <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-red-100 bg-red-50 p-2 font-mono text-xs leading-5 text-red-950">
            {change.beforeLines.join("\n") || "[new text]"}
          </pre>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Proposed
          </span>
          <textarea
            className={`${textareaClass} min-h-28 font-mono text-xs leading-5 ${
              isAccepted ? "border-emerald-300 bg-emerald-50" : ""
            }`}
            disabled={isRejected}
            onChange={(event) => onEdit(event.target.value)}
            value={editedAfterText}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={
            isAccepted
              ? primaryButtonClass
              : "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 active:translate-y-px"
          }
          onClick={() => onDecision("accepted")}
          type="button"
        >
          Accept
        </button>
        <button
          className={
            isRejected
              ? primaryButtonClass
              : "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px"
          }
          onClick={() => onDecision("rejected")}
          type="button"
        >
          Reject
        </button>
      </div>
    </article>
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

async function hydrateProviderSecretStatus(configs: AiProviderConfig[]) {
  if (!window.resumelab?.secrets) {
    return configs.map((config) => ({ ...config, hasSecret: false }));
  }

  return Promise.all(
    configs.map(async (config) => ({
      ...config,
      hasSecret: await window.resumelab!.secrets!.hasProviderKey(config.id),
    })),
  );
}

function restoreResumeHeader(proposedText: string, currentText: string) {
  const proposedLines = proposedText.split(/\r?\n/);
  const currentLines = currentText.split(/\r?\n/);

  if (proposedLines.length < 3 || currentLines.length < 3) {
    return proposedText;
  }

  return [
    currentLines[0],
    currentLines[1],
    currentLines[2],
    ...proposedLines.slice(3),
  ]
    .join("\n")
    .trim();
}

function formatChangeKind(kind: AiProposalReviewChange["kind"]) {
  if (kind === "insert") {
    return "Insert";
  }

  if (kind === "delete") {
    return "Remove";
  }

  return "Replace";
}

function formatReviewLineRange(change: AiProposalReviewChange) {
  const beforeRange = formatLineRange(
    change.beforeStartLine + 1,
    change.beforeEndLine,
  );
  const afterRange = formatLineRange(
    change.afterStartLine + 1,
    change.afterEndLine,
  );

  return `Current ${beforeRange} -> Proposed ${afterRange}`;
}

function formatLineRange(start: number, end: number) {
  if (end < start) {
    return "new line";
  }

  return start === end ? `line ${start}` : `lines ${start}-${end}`;
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected studio error occurred.";
}
