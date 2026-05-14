import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowClockwise,
  Briefcase,
  CheckCircle,
  Cloud,
  Cpu,
  DownloadSimple,
  FloppyDisk,
  Palette,
  Robot,
  Sliders,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  type JobApplication,
  type JobApplicationStatus,
  type LocalModelEndpoint,
  type LocalModelReadinessStatus,
  type PromptProfile,
  type TemplateDefinition,
  type TemplateGalleryCategory,
  type V2WorkspaceState,
} from "../domain/v2";
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
  {
    id: "advanced",
    label: "Advanced Editing",
    description: "SyncTeX, review, import",
    icon: Sliders,
  },
  {
    id: "sync",
    label: "Future Sync",
    description: "Deferred collaboration foundation",
    icon: Cloud,
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

const repository = createV2Repository();

const inputClass =
  "min-h-10 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

const textareaClass =
  "min-h-24 w-full min-w-0 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

const primaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400";

const secondaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400";

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
          setNotice("Loaded v2 foundations from local storage.");
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
      setNotice("Saved v2 foundations locally.");
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
      setNotice("Reset v2 foundations to sample data.");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(formatError(error));
    }
  };

  const handleExport = async () => {
    try {
      const json = await repository.exportJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `resumelab-v2-foundations-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Exported v2 foundations JSON.");
    } catch (error) {
      setErrorMessage(formatError(error));
    }
  };

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-zinc-100 text-zinc-950">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-950">V2 Lab</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Foundations for deferred roadmap features. These are metadata and
              workflow surfaces, not full cloud/AI implementations.
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
                  <Badge>Foundations only</Badge>
                  <Badge>{isDirty ? "Unsaved changes" : "Saved baseline"}</Badge>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  V2 Feature Foundations
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                  Start v2 without pretending unfinished v1 systems exist yet:
                  template metadata, job tracking, prompt profiles, local model
                  configuration, advanced-editing flags, and sync placeholders.
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
            <InlineNotice tone="error" title="V2 storage attention">
              {errorMessage}
            </InlineNotice>
          ) : null}

          {notice && !errorMessage ? (
            <InlineNotice tone="info" title="V2 workspace">
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
            <InlineNotice tone="error" title="V2 unavailable">
              The v2 workspace could not initialize.
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
  const updateTemplate = (id: string, patch: Partial<TemplateDefinition>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      templates: workspace.templates.map((template) =>
        template.id === id ? { ...template, ...patch } : template,
      ),
    }));
  };

  return (
    <Panel
      icon={Palette}
      subtitle="Template gallery entries and guided LaTeX mapping metadata."
      title="Template Foundations"
    >
      <div className="grid gap-4">
        {templates.map((template) => (
          <Item key={template.id} kicker={template.source} title={template.name}>
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
  const updateJob = (id: string, patch: Partial<JobApplication>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      jobApplications: workspace.jobApplications.map((job) =>
        job.id === id ? { ...job, ...patch } : job,
      ),
    }));
  };

  return (
    <Panel
      icon={Briefcase}
      subtitle="Application status metadata without browser extension or live scraping yet."
      title="Job Tracker Foundations"
    >
      <div className="grid gap-4">
        {jobs.map((job) => (
          <Item key={job.id} kicker={job.company} title={job.roleTitle}>
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
                onChange={(status) => updateJob(job.id, { status })}
                options={jobStatuses}
                value={job.status}
              />
            </div>
            <TextArea
              label="Notes"
              onChange={(notes) => updateJob(job.id, { notes })}
              value={job.notes}
            />
            <TextArea
              label="Tracked keywords"
              onChange={(keywords) =>
                updateJob(job.id, {
                  signalReview: {
                    ...job.signalReview,
                    keywords: commaTextToList(keywords),
                  },
                })
              }
              value={job.signalReview.keywords.join(", ")}
            />
          </Item>
        ))}
      </div>
    </Panel>
  );
}

function PromptsPanel({
  prompts,
  updateWorkspace,
}: {
  prompts: PromptProfile[];
  updateWorkspace: (
    updater: (workspace: V2WorkspaceState) => V2WorkspaceState,
  ) => void;
}) {
  const updatePrompt = (id: string, patch: Partial<PromptProfile>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      promptProfiles: workspace.promptProfiles.map((prompt) =>
        prompt.id === id ? { ...prompt, ...patch } : prompt,
      ),
    }));
  };

  return (
    <Panel
      icon={Robot}
      subtitle="Reusable prompts for future provider comparison, cover letters, and review flows."
      title="Prompt Profiles"
    >
      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <Item key={prompt.id} kicker={prompt.purpose} title={prompt.name}>
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
  const updateModel = (id: string, patch: Partial<LocalModelEndpoint>) => {
    updateWorkspace((workspace) => ({
      ...workspace,
      localModelEndpoints: workspace.localModelEndpoints.map((model) =>
        model.id === id ? { ...model, ...patch } : model,
      ),
    }));
  };

  return (
    <Panel
      icon={Cpu}
      subtitle="Local model endpoint metadata only; no inference calls in this pass."
      title="Local Model Foundations"
    >
      <div className="grid gap-4">
        {models.map((model) => (
          <Item key={model.id} kicker={model.providerKind} title={model.label}>
            <div className="grid gap-4 lg:grid-cols-3">
              <TextInput
                label="Label"
                onChange={(label) => updateModel(model.id, { label })}
                value={model.label}
              />
              <TextInput
                label="Base URL"
                onChange={(baseUrl) => updateModel(model.id, { baseUrl })}
                value={model.baseUrl}
              />
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
  children,
  icon: IconComponent,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: Icon;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="flex min-w-0 gap-3 border-b border-zinc-200 p-4 sm:p-5">
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
      <div className="grid gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Item({
  children,
  kicker,
  title,
}: {
  children: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {formatLabel(kicker)}
        </p>
        <h3 className="mt-1 truncate text-base font-semibold text-zinc-950">
          {title}
        </h3>
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

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected v2 workspace error occurred.";
}
