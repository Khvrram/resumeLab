import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowClockwise,
  Briefcase,
  CheckCircle,
  Cloud,
  Cpu,
  Copy,
  DownloadSimple,
  FloppyDisk,
  Palette,
  Plus,
  Robot,
  Sliders,
  Trash,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  type JobApplication,
  type JobApplicationStatus,
  type LocalModelEndpoint,
  type LocalModelProviderKind,
  type LocalModelReadinessStatus,
  type PromptProfile,
  type RemotePolicy,
  type TemplateDefinition,
  type TemplateGalleryCategory,
  type V2WorkspaceState,
} from "../domain/v2";
import {
  checkLocalModelEndpoint,
  createJobApplication,
  createLocalModelEndpoint,
  createPromptProfile,
  createTemplateDefinition,
  duplicatePromptProfile,
  duplicateTemplateDefinition,
  refreshJobApplicationSignals,
  renderPromptPreview,
  updateJobApplicationStatus,
} from "../domain/v2Actions";
import { createV2Repository } from "../storage/v2Repository";

type SaveState = "idle" | "saving" | "saved" | "error";
type V2SectionId =
  | "templates"
  | "jobs"
  | "prompts"
  | "models"
  | "advanced"
  | "sync";

type SectionDefinition = {
  id: V2SectionId;
  label: string;
  description: string;
  icon: Icon;
};

const sections: SectionDefinition[] = [
  {
    id: "templates",
    label: "Templates",
    description: "Gallery and import mapping",
    icon: Palette,
  },
  {
    id: "jobs",
    label: "Job Tracker",
    description: "Applications and captured roles",
    icon: Briefcase,
  },
  {
    id: "prompts",
    label: "Prompt Profiles",
    description: "Reusable AI instructions",
    icon: Robot,
  },
  {
    id: "models",
    label: "Local Models",
    description: "Ollama and compatible endpoints",
    icon: Cpu,
  },
];

const jobStatuses: JobApplicationStatus[] = [
  "saved",
  "tailoring",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "archived",
];

const templateCategories: TemplateGalleryCategory[] = [
  "ats",
  "technical",
  "executive",
  "academic",
  "creative",
];

const modelReadiness: LocalModelReadinessStatus[] = [
  "not-configured",
  "configured",
  "checking",
  "ready",
  "unreachable",
  "error",
];

const remotePolicies: RemotePolicy[] = ["unknown", "remote", "hybrid", "onsite"];

const localModelProviderKinds: LocalModelProviderKind[] = [
  "ollama",
  "lm-studio",
  "openai-compatible",
  "custom",
];

const repository = createV2Repository();

const inputClass =
  "min-h-10 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

const textareaClass =
  "min-h-24 w-full min-w-0 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

const primaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400";

const secondaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

const compactButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

const compactDangerButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50 active:translate-y-px";

export function V2Workspace() {
  const [activeSection, setActiveSection] = useState<V2SectionId>("templates");
  const [workspace, setWorkspace] = useState<V2WorkspaceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const loaded = await repository.load();

        if (isMounted) {
          setWorkspace(loaded);
          setNotice("Loaded workspace from local storage.");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(formatError(error));
        }
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

  const summary = useMemo(() => {
    if (!workspace) {
      return null;
    }

    return {
      templates: workspace.templates.length,
      jobs: workspace.jobApplications.length,
      prompts: workspace.promptProfiles.length,
      models: workspace.localModelEndpoints.length,
    };
  }, [workspace]);

  const updateWorkspace = (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => {
    setWorkspace((current) => {
      if (!current) {
        return current;
      }

      return {
        ...updater(current),
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
    setSaveState("idle");
    setNotice(null);
  };

  const handleSave = async () => {
    if (!workspace) {
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const nextWorkspace = {
        ...workspace,
        updatedAt: new Date().toISOString(),
      };
      await repository.save(nextWorkspace);
      setWorkspace(nextWorkspace);
      setIsDirty(false);
      setSaveState("saved");
      setNotice("Saved workspace locally.");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(formatError(error));
    }
  };

  const handleReset = async () => {
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const sample = await repository.reset();
      setWorkspace(sample);
      setIsDirty(false);
      setSaveState("saved");
      setNotice("Reset workspace to sample data.");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(formatError(error));
    }
  };

  const handleExport = async () => {
    if (!workspace) {
      return;
    }

    try {
      const json = JSON.stringify(workspace, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `resumelab-jobs-templates-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Exported jobs and templates JSON.");
    } catch (error) {
      setErrorMessage(formatError(error));
    }
  };

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-zinc-100 text-zinc-950">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-950">
              Jobs and Templates
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Build job targets, templates, prompt profiles, and local model
              endpoints as editable local records.
            </p>
          </div>

          <nav className="grid gap-1 p-2">
            {sections.map((section) => {
              const IconComponent = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  className={`flex min-h-14 min-w-0 items-center gap-3 rounded-md px-3 text-left transition active:translate-y-px ${
                    isActive
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <IconComponent
                    className="shrink-0"
                    size={19}
                    weight={isActive ? "fill" : "regular"}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {section.label}
                    </span>
                    <span
                      className={`block truncate text-xs ${
                        isActive ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="grid min-w-0 content-start gap-4">
          <header className="rounded-md border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge>Local workflows</Badge>
                  <Badge>{isDirty ? "Unsaved changes" : "Saved baseline"}</Badge>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Jobs, Templates, and Models
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                  Create real local records for job applications, template
                  mapping, prompt previews, and local model endpoint checks.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={secondaryButtonClass}
                  disabled={isLoading || saveState === "saving"}
                  onClick={handleReset}
                  type="button"
                >
                  <ArrowClockwise size={17} />
                  Reset sample
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={isLoading || !workspace}
                  onClick={handleExport}
                  type="button"
                >
                  <DownloadSimple size={17} />
                  Export JSON
                </button>
                <button
                  className={primaryButtonClass}
                  disabled={!isDirty || isLoading || saveState === "saving"}
                  onClick={handleSave}
                  type="button"
                >
                  <FloppyDisk size={17} />
                  {saveState === "saving" ? "Saving" : "Save"}
                </button>
              </div>
            </div>
          </header>

          {errorMessage ? (
            <InlineNotice tone="error" title="Storage attention">
              {errorMessage}
            </InlineNotice>
          ) : null}

          {notice && !errorMessage ? (
            <InlineNotice tone="info" title="Workspace">
              {notice}
            </InlineNotice>
          ) : null}

          {summary ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Templates" value={summary.templates} />
              <Metric label="Applications" value={summary.jobs} />
              <Metric label="Prompt profiles" value={summary.prompts} />
              <Metric label="Local endpoints" value={summary.models} />
            </div>
          ) : null}

          {isLoading ? (
            <LoadingPanel />
          ) : workspace ? (
            <ActiveV2Section
              activeSection={activeSection}
              updateWorkspace={updateWorkspace}
              workspace={workspace}
            />
          ) : (
            <InlineNotice tone="error" title="Workspace unavailable">
              The jobs and templates workspace could not initialize.
            </InlineNotice>
          )}
        </section>
      </div>
    </main>
  );
}

function ActiveV2Section({
  activeSection,
  updateWorkspace,
  workspace,
}: {
  activeSection: V2SectionId;
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
  workspace: V2WorkspaceState;
}) {
  switch (activeSection) {
    case "templates":
      return (
        <TemplatesPanel
          templates={workspace.templates}
          updateWorkspace={updateWorkspace}
        />
      );
    case "jobs":
      return (
        <JobsPanel
          jobs={workspace.jobApplications}
          updateWorkspace={updateWorkspace}
        />
      );
    case "prompts":
      return (
        <PromptsPanel
          jobs={workspace.jobApplications}
          prompts={workspace.promptProfiles}
          updateWorkspace={updateWorkspace}
        />
      );
    case "models":
      return (
        <ModelsPanel
          models={workspace.localModelEndpoints}
          updateWorkspace={updateWorkspace}
        />
      );
    case "advanced":
      return (
        <AdvancedPanel
          updateWorkspace={updateWorkspace}
          workspace={workspace}
        />
      );
    case "sync":
      return <SyncPanel updateWorkspace={updateWorkspace} workspace={workspace} />;
    default:
      return null;
  }
}

function TemplatesPanel({
  templates,
  updateWorkspace,
}: {
  templates: TemplateDefinition[];
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
}) {
  const addTemplate = () => {
    updateWorkspace((workspace) => ({
      ...workspace,
      templates: [createTemplateDefinition(), ...workspace.templates],
    }));
  };

  const updateTemplate = (id: string, patch: Partial<TemplateDefinition>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      templates: workspace.templates.map((template) =>
        template.id === id ? { ...template, ...patch } : template,
      ),
    }));
  };

  const duplicateTemplate = (template: TemplateDefinition) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      templates: [duplicateTemplateDefinition(template), ...workspace.templates],
    }));
  };

  const removeTemplate = (id: string) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      templates: workspace.templates.filter((template) => template.id !== id),
    }));
  };

  return (
    <Panel
      action={
        <button className={secondaryButtonClass} onClick={addTemplate} type="button">
          <Plus size={16} />
          Add template
        </button>
      }
      icon={Palette}
      subtitle="Create and edit local LaTeX template records with mapping placeholders."
      title="Templates"
    >
      <div className="grid gap-4">
        {templates.map((template) => (
          <Item
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  className={compactButtonClass}
                  onClick={() => duplicateTemplate(template)}
                  type="button"
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  className={compactDangerButtonClass}
                  onClick={() => removeTemplate(template.id)}
                  type="button"
                >
                  <Trash size={14} />
                  Remove
                </button>
              </div>
            }
            key={template.id}
            kicker={template.source}
            title={template.name}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <TextInput
                label="Template name"
                onChange={(name) => updateTemplate(template.id, { name })}
                value={template.name}
              />
              <SelectInput
                label="Category"
                onChange={(galleryCategory) =>
                  updateTemplate(template.id, { galleryCategory })
                }
                options={templateCategories}
                value={template.galleryCategory}
              />
            </div>
            <TextArea
              label="Description"
              onChange={(description) =>
                updateTemplate(template.id, { description })
              }
              value={template.description}
            />
            <TextInput
              label="Tags"
              onChange={(tags) =>
                updateTemplate(template.id, {
                  tags: commaTextToList(tags),
                })
              }
              value={template.tags.join(", ")}
            />
            <TextArea
              label="Required placeholders"
              onChange={(requiredPlaceholders) =>
                updateTemplate(template.id, {
                  importGuide: {
                    ...template.importGuide,
                    requiredPlaceholders: commaTextToList(requiredPlaceholders),
                  },
                })
              }
              value={template.importGuide.requiredPlaceholders.join(", ")}
            />
          </Item>
        ))}
      </div>
    </Panel>
  );
}

function JobsPanel({
  jobs,
  updateWorkspace,
}: {
  jobs: JobApplication[];
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
}) {
  const addJob = () => {
    updateWorkspace((workspace) => ({
      ...workspace,
      jobApplications: [createJobApplication(), ...workspace.jobApplications],
    }));
  };

  const updateJob = (id: string, patch: Partial<JobApplication>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      jobApplications: workspace.jobApplications.map((job) =>
        job.id === id ? { ...job, ...patch } : job,
      ),
    }));
  };

  const updateStatus = (job: JobApplication, status: JobApplicationStatus) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      jobApplications: workspace.jobApplications.map((item) =>
        item.id === job.id ? updateJobApplicationStatus(job, status) : item,
      ),
    }));
  };

  const refreshSignals = (job: JobApplication) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      jobApplications: workspace.jobApplications.map((item) =>
        item.id === job.id ? refreshJobApplicationSignals(job) : item,
      ),
    }));
  };

  const removeJob = (id: string) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      jobApplications: workspace.jobApplications.filter((job) => job.id !== id),
    }));
  };

  return (
    <Panel
      action={
        <button className={secondaryButtonClass} onClick={addJob} type="button">
          <Plus size={16} />
          Add job
        </button>
      }
      icon={Briefcase}
      subtitle="Create applications, paste job descriptions, extract local signals, and track status."
      title="Job Tracker"
    >
      <div className="grid gap-4">
        {jobs.map((job) => (
          <Item
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  className={compactButtonClass}
                  onClick={() => refreshSignals(job)}
                  type="button"
                >
                  <CheckCircle size={14} />
                  Extract
                </button>
                <button
                  className={compactDangerButtonClass}
                  onClick={() => removeJob(job.id)}
                  type="button"
                >
                  <Trash size={14} />
                  Remove
                </button>
              </div>
            }
            key={job.id}
            kicker={job.company}
            title={job.roleTitle}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <TextInput
                label="Role title"
                onChange={(roleTitle) => updateJob(job.id, { roleTitle })}
                value={job.roleTitle}
              />
              <TextInput
                label="Company"
                onChange={(company) => updateJob(job.id, { company })}
                value={job.company}
              />
              <SelectInput
                label="Status"
                onChange={(status) => updateStatus(job, status)}
                options={jobStatuses}
                value={job.status}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <TextInput
                label="Location"
                onChange={(location) => updateJob(job.id, { location })}
                value={job.location}
              />
              <SelectInput
                label="Remote policy"
                onChange={(remotePolicy) => updateJob(job.id, { remotePolicy })}
                options={remotePolicies}
                value={job.remotePolicy}
              />
              <TextInput
                label="Source URL"
                onChange={(url) =>
                  updateJob(job.id, {
                    source: {
                      ...job.source,
                      url,
                    },
                  })
                }
                value={job.source.url ?? ""}
              />
            </div>
            <TextArea
              label="Job description"
              onChange={(jobDescription) => updateJob(job.id, { jobDescription })}
              value={job.jobDescription}
            />
            <TextArea
              label="Notes"
              onChange={(notes) => updateJob(job.id, { notes })}
              value={job.notes}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <TextArea
                label="Requirements"
                onChange={(requirements) =>
                  updateJob(job.id, {
                    signalReview: {
                      ...job.signalReview,
                      requirements: lineTextToList(requirements),
                      userReviewed: true,
                    },
                  })
                }
                value={job.signalReview.requirements.join("\n")}
              />
              <TextArea
                label="Tracked keywords"
                onChange={(keywords) =>
                  updateJob(job.id, {
                    signalReview: {
                      ...job.signalReview,
                      keywords: commaTextToList(keywords),
                      userReviewed: true,
                    },
                  })
                }
                value={job.signalReview.keywords.join(", ")}
              />
              <TextArea
                label="Tools"
                onChange={(tools) =>
                  updateJob(job.id, {
                    signalReview: {
                      ...job.signalReview,
                      tools: commaTextToList(tools),
                      userReviewed: true,
                    },
                  })
                }
                value={job.signalReview.tools.join(", ")}
              />
            </div>
          </Item>
        ))}
      </div>
    </Panel>
  );
}

function PromptsPanel({
  jobs,
  prompts,
  updateWorkspace,
}: {
  jobs: JobApplication[];
  prompts: PromptProfile[];
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
}) {
  const previewJob = jobs[0] ?? null;

  const addPrompt = () => {
    updateWorkspace((workspace) => ({
      ...workspace,
      promptProfiles: [createPromptProfile(), ...workspace.promptProfiles],
    }));
  };

  const updatePrompt = (id: string, patch: Partial<PromptProfile>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      promptProfiles: workspace.promptProfiles.map((prompt) =>
        prompt.id === id ? { ...prompt, ...patch } : prompt,
      ),
    }));
  };

  const duplicatePrompt = (prompt: PromptProfile) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      promptProfiles: [duplicatePromptProfile(prompt), ...workspace.promptProfiles],
    }));
  };

  const removePrompt = (id: string) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      promptProfiles: workspace.promptProfiles.filter((prompt) => prompt.id !== id),
    }));
  };

  return (
    <Panel
      action={
        <button className={secondaryButtonClass} onClick={addPrompt} type="button">
          <Plus size={16} />
          Add prompt
        </button>
      }
      icon={Robot}
      subtitle="Create prompt profiles and inspect the exact context that would be sent later."
      title="Prompt Profiles"
    >
      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <Item
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  className={compactButtonClass}
                  onClick={() => duplicatePrompt(prompt)}
                  type="button"
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  className={compactDangerButtonClass}
                  onClick={() => removePrompt(prompt.id)}
                  type="button"
                >
                  <Trash size={14} />
                  Remove
                </button>
              </div>
            }
            key={prompt.id}
            kicker={prompt.purpose}
            title={prompt.name}
          >
            <TextInput
              label="Profile name"
              onChange={(name) => updatePrompt(prompt.id, { name })}
              value={prompt.name}
            />
            <TextArea
              label="System prompt"
              onChange={(systemPrompt) =>
                updatePrompt(prompt.id, { systemPrompt })
              }
              value={prompt.systemPrompt}
            />
            <TextArea
              label="User prompt template"
              onChange={(userPromptTemplate) =>
                updatePrompt(prompt.id, { userPromptTemplate })
              }
              value={prompt.userPromptTemplate}
            />
            <TextInput
              label="Tags"
              onChange={(tags) =>
                updatePrompt(prompt.id, { tags: commaTextToList(tags) })
              }
              value={prompt.tags.join(", ")}
            />
            {previewJob ? (
              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-medium text-zinc-700">
                  Prompt preview using first tracked job
                </span>
                <textarea
                  className={`${textareaClass} min-h-52 font-mono text-xs leading-5`}
                  readOnly
                  value={renderPromptPreview({
                    promptProfile: prompt,
                    job: previewJob,
                    resumeText:
                      "Approved resume context is assembled from the v1 draft before a provider call.",
                  }).userPrompt}
                />
              </label>
            ) : null}
          </Item>
        ))}
      </div>
    </Panel>
  );
}

function ModelsPanel({
  models,
  updateWorkspace,
}: {
  models: LocalModelEndpoint[];
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
}) {
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  const addModel = () => {
    updateWorkspace((workspace) => ({
      ...workspace,
      localModelEndpoints: [
        createLocalModelEndpoint(),
        ...workspace.localModelEndpoints,
      ],
    }));
  };

  const updateModel = (id: string, patch: Partial<LocalModelEndpoint>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      localModelEndpoints: workspace.localModelEndpoints.map((model) =>
        model.id === id ? { ...model, ...patch } : model,
      ),
    }));
  };

  const removeModel = (id: string) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      localModelEndpoints: workspace.localModelEndpoints.filter(
        (model) => model.id !== id,
      ),
    }));
  };

  const checkModel = async (model: LocalModelEndpoint) => {
    setCheckingIds((current) => new Set(current).add(model.id));
    updateModel(model.id, { readiness: "checking", failureMessage: null });

    const result = await checkLocalModelEndpoint(model);

    updateModel(model.id, {
      readiness: result.readiness,
      lastCheckedAt: result.checkedAt,
      failureMessage: result.failureMessage,
    });
    setCheckingIds((current) => {
      const next = new Set(current);
      next.delete(model.id);
      return next;
    });
  };

  return (
    <Panel
      action={
        <button className={secondaryButtonClass} onClick={addModel} type="button">
          <Plus size={16} />
          Add endpoint
        </button>
      }
      icon={Cpu}
      subtitle="Register local model servers and check whether their model-list endpoint responds."
      title="Local Models"
    >
      <div className="grid gap-4">
        {models.map((model) => (
          <Item
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  className={compactButtonClass}
                  disabled={checkingIds.has(model.id)}
                  onClick={() => void checkModel(model)}
                  type="button"
                >
                  <CheckCircle size={14} />
                  {checkingIds.has(model.id) ? "Checking" : "Check"}
                </button>
                <button
                  className={compactDangerButtonClass}
                  onClick={() => removeModel(model.id)}
                  type="button"
                >
                  <Trash size={14} />
                  Remove
                </button>
              </div>
            }
            key={model.id}
            kicker={model.providerKind}
            title={model.label}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <TextInput
                label="Label"
                onChange={(label) => updateModel(model.id, { label })}
                value={model.label}
              />
              <SelectInput
                label="Provider"
                onChange={(providerKind) => updateModel(model.id, { providerKind })}
                options={localModelProviderKinds}
                value={model.providerKind}
              />
              <TextInput
                label="Base URL"
                onChange={(baseUrl) => updateModel(model.id, { baseUrl })}
                value={model.baseUrl}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <SelectInput
                label="Readiness"
                onChange={(readiness) => updateModel(model.id, { readiness })}
                options={modelReadiness}
                value={model.readiness}
              />
            </div>
            <TextInput
              label="Model"
              onChange={(modelName) => updateModel(model.id, { model: modelName })}
              value={model.model}
            />
            {model.failureMessage ? (
              <InlineNotice tone="error" title="Endpoint check failed">
                {model.failureMessage}
              </InlineNotice>
            ) : null}
          </Item>
        ))}
      </div>
    </Panel>
  );
}

function AdvancedPanel({
  updateWorkspace,
  workspace,
}: {
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
  workspace: V2WorkspaceState;
}) {
  return (
    <Panel
      icon={Sliders}
      subtitle="Feature flags for future SyncTeX, quality review, and high-confidence import."
      title="Advanced Editing Foundations"
    >
      <div className="grid gap-3">
        <Toggle
          checked={workspace.advancedEditing.syncTexNavigation.enabled}
          label="Enable SyncTeX navigation foundation"
          onChange={(enabled) =>
            updateWorkspace((current) => ({
              ...current,
              advancedEditing: {
                ...current.advancedEditing,
                syncTexNavigation: {
                  ...current.advancedEditing.syncTexNavigation,
                  enabled,
                },
              },
            }))
          }
        />
        <Toggle
          checked={
            workspace.advancedEditing.qualityReview
              .grammarToneImpactScoringEnabled
          }
          label="Enable grammar, tone, and impact review foundation"
          onChange={(grammarToneImpactScoringEnabled) =>
            updateWorkspace((current) => ({
              ...current,
              advancedEditing: {
                ...current.advancedEditing,
                qualityReview: {
                  ...current.advancedEditing.qualityReview,
                  grammarToneImpactScoringEnabled,
                },
              },
            }))
          }
        />
        <Toggle
          checked={workspace.advancedEditing.factImport.highConfidenceImportEnabled}
          label="Enable high-confidence fact import review foundation"
          onChange={(highConfidenceImportEnabled) =>
            updateWorkspace((current) => ({
              ...current,
              advancedEditing: {
                ...current.advancedEditing,
                factImport: {
                  ...current.advancedEditing.factImport,
                  highConfidenceImportEnabled,
                },
              },
            }))
          }
        />
      </div>
    </Panel>
  );
}

function SyncPanel({
  updateWorkspace,
  workspace,
}: {
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
  workspace: V2WorkspaceState;
}) {
  return (
    <Panel
      icon={Cloud}
      subtitle="Deferred cloud sync and sharing controls. Local-only remains the default."
      title="Future Sync Foundation"
    >
      <div className="grid gap-3">
        <Toggle
          checked={workspace.sync.encryptedCloudSyncEnabled}
          label="Encrypted cloud sync intent"
          onChange={(encryptedCloudSyncEnabled) =>
            updateWorkspace((current) => ({
              ...current,
              sync: {
                ...current.sync,
                encryptedCloudSyncEnabled,
                cloudStatus: encryptedCloudSyncEnabled
                  ? "opted-in-not-configured"
                  : "local-only",
              },
            }))
          }
        />
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          Collaboration and public preview links stay disabled until v1 export,
          identity, encryption, and sharing boundaries are designed.
        </p>
      </div>
    </Panel>
  );
}

function Panel({
  action,
  children,
  icon: IconComponent,
  subtitle,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: Icon;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
            <IconComponent size={21} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              {title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
              {subtitle}
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="grid gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Item({
  action,
  children,
  kicker,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {formatLabel(kicker)}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-zinc-950">
            {title}
          </h3>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="grid gap-4 p-4">{children}</div>
    </article>
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
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea
        className={textareaClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectInput<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: T[];
  value: T;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className={inputClass}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-zinc-200 bg-white p-3 text-sm">
      <span className="min-w-0 font-medium text-zinc-800">{label}</span>
      <input
        checked={checked}
        className="size-4 accent-zinc-950"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function InlineNotice({
  children,
  title,
  tone,
}: {
  children: ReactNode;
  title: string;
  tone: "error" | "info";
}) {
  const isError = tone === "error";
  const IconComponent = isError ? WarningCircle : CheckCircle;

  return (
    <div
      className={`flex gap-3 rounded-md border p-4 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-zinc-200 bg-white text-zinc-700"
      }`}
      role={isError ? "alert" : "status"}
    >
      <IconComponent
        className={isError ? "text-red-700" : "text-emerald-700"}
        size={19}
      />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{children}</p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="animate-pulse">
        <div className="h-5 w-56 rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-zinc-100" />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="h-28 rounded-md bg-zinc-100" />
          <div className="h-28 rounded-md bg-zinc-100" />
        </div>
      </div>
    </section>
  );
}

function commaTextToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function lineTextToList(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected workspace error occurred.";
}
