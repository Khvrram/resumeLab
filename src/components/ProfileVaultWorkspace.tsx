import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Briefcase,
  CheckCircle,
  CloudSlash,
  Database,
  DownloadSimple,
  UploadSimple,
  Eye,
  EyeSlash,
  FileText,
  FloppyDisk,
  Folders,
  GraduationCap,
  IdentificationCard,
  ListChecks,
  LockKey,
  Plus,
  Prohibit,
  ShieldCheck,
  Stack,
  Trash,
  Vault,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  countVisibility,
  createEmptyEducation,
  createEmptyExperience,
  createEmptyOptionalSection,
  createEmptyProfile,
  createEmptyProject,
  createEmptySkillGroup,
  createProfileId,
  createSampleProfile,
  isProfileEmpty,
  visibilityOptions,
  type EducationEntry,
  type ExperienceEntry,
  type OptionalSection,
  type ProfileBasics,
  type ProfileLink,
  type ProjectEntry,
  type ResumeProfile,
  type SkillGroup,
  type VisibilityStatus,
} from "./profileTypes";
import {
  loadProfileFromRepository,
  resetProfileSampleData,
  saveProfileToRepository,
} from "./profileRepositoryAdapter";
import {
  buildAiEgressPreview,
  buildResumeDraft,
  createResumeFileName,
  renderResumePlainText,
} from "../domain/resumeDraft";
import { renderKhurramsResumeLatex } from "../domain/khurramsResumeTemplate";

type SectionId =
  | "basics"
  | "draft"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "optional"
  | "privacy";

type SaveState = "idle" | "saving" | "saved" | "error";

type NavItem = {
  id: SectionId;
  label: string;
  icon: Icon;
  count: (profile: ResumeProfile) => number;
};

const navItems: NavItem[] = [
  {
    id: "basics",
    label: "Basics",
    icon: IdentificationCard,
    count: (profile) =>
      profile.basics.fullName.trim() || profile.basics.email.trim() ? 1 : 0,
  },
  {
    id: "draft",
    label: "Resume Draft",
    icon: ListChecks,
    count: (profile) => (isProfileEmpty(profile) ? 0 : 1),
  },
  {
    id: "experience",
    label: "Experience",
    icon: Briefcase,
    count: (profile) => profile.experience.length,
  },
  {
    id: "projects",
    label: "Projects",
    icon: Folders,
    count: (profile) => profile.projects.length,
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    count: (profile) => profile.education.length,
  },
  {
    id: "skills",
    label: "Skills",
    icon: Stack,
    count: (profile) => profile.skills.length,
  },
  {
    id: "optional",
    label: "Optional Sections",
    icon: FileText,
    count: (profile) => profile.optionalSections.length,
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: ShieldCheck,
    count: (profile) => {
      const counts = countVisibility(profile);
      return counts.private + counts.excluded;
    },
  },
];

const inputClass =
  "min-h-10 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50";

const textareaClass =
  "min-h-28 w-full min-w-0 resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const primaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:active:translate-y-0";

const secondaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:text-zinc-400 disabled:active:translate-y-0";

const dangerButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 active:translate-y-px";

const visibilityStyles: Record<VisibilityStatus, string> = {
  eligible: "border-emerald-200 bg-emerald-50 text-emerald-800",
  private: "border-amber-200 bg-amber-50 text-amber-800",
  excluded: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

const visibilityIcons: Record<VisibilityStatus, Icon> = {
  eligible: Eye,
  private: EyeSlash,
  excluded: Prohibit,
};

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected profile storage error occurred.";
};

const listToText = (items: string[]) => items.join("\n");

const textToList = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const listToCommaText = (items: string[]) => items.join(", ");

const commaTextToList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not saved yet";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const downloadTextFile = (fileName: string, contents: string, type: string) => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ProfileVaultWorkspace() {
  const [activeSection, setActiveSection] = useState<SectionId>("basics");
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const storedProfile = await loadProfileFromRepository();

        if (!isMounted) {
          return;
        }

        const nextProfile = storedProfile ?? createEmptyProfile();

        setProfile(nextProfile);
        setNotice(
          isProfileEmpty(nextProfile)
            ? "No profile facts saved yet. Start with your real career facts."
            : "Loaded local profile.",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProfile(createEmptyProfile());
        setErrorMessage(formatError(error));
        setNotice("Storage is not connected, so changes are in memory only.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibilityCounts = useMemo(
    () => (profile ? countVisibility(profile) : null),
    [profile],
  );

  const updateProfile = (updater: (profile: ResumeProfile) => ResumeProfile) => {
    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      return {
        ...updater(currentProfile),
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
    setSaveState("idle");
    setNotice(null);
  };

  const handleSave = async () => {
    if (!profile) {
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const savedProfile = await saveProfileToRepository(profile);
      setProfile(savedProfile);
      setIsDirty(false);
      setSaveState("saved");
      setNotice(`Saved locally at ${formatUpdatedAt(savedProfile.updatedAt)}.`);
    } catch (error) {
      setSaveState("error");
      setErrorMessage(formatError(error));
    }
  };

  const handleResetSampleData = async () => {
    setErrorMessage(null);
    setSaveState("saving");

    try {
      const sampleProfile = await resetProfileSampleData();
      setProfile(sampleProfile);
      setIsDirty(false);
      setSaveState("saved");
      setNotice("Sample profile data loaded locally.");
    } catch (error) {
      const sampleProfile = createSampleProfile();
      setProfile(sampleProfile);
      setIsDirty(true);
      setSaveState("error");
      setErrorMessage(
        `${formatError(error)} Sample data is loaded in memory only.`,
      );
    }
  };

  const handleExportJson = () => {
    if (!profile) {
      return;
    }

    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `resumelab-profile-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Exported a JSON snapshot of the current profile.");
  };

  const statusLabel = isLoading
    ? "Loading"
    : errorMessage
      ? "Needs storage"
      : isDirty
        ? "Unsaved changes"
        : saveState === "saved"
          ? "Saved locally"
          : "Ready";

  return (
    <main className="min-h-[100dvh] bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col border-x border-zinc-200 bg-white lg:flex-row">
        <WorkspaceSidebar
          activeSection={activeSection}
          isDirty={isDirty}
          profile={profile}
          setActiveSection={setActiveSection}
          statusLabel={statusLabel}
          visibilityCounts={visibilityCounts}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            isDirty={isDirty}
            isLoading={isLoading}
            onExportJson={handleExportJson}
            onResetSampleData={handleResetSampleData}
            onSave={handleSave}
            saveState={saveState}
            statusLabel={statusLabel}
          />

          <div className="min-w-0 flex-1 overflow-y-auto bg-zinc-50 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-4">
              {errorMessage ? (
                <InlineNotice tone="error" title="Storage attention">
                  {errorMessage}
                </InlineNotice>
              ) : null}

              {notice && !errorMessage ? (
                <InlineNotice tone="info" title="Vault status">
                  {notice}
                </InlineNotice>
              ) : null}

              {isLoading ? (
                <LoadingProfileState />
              ) : profile ? (
                <>
                  {isProfileEmpty(profile) ? (
                    <EmptyProfileBanner
                      onAddBasics={() => setActiveSection("basics")}
                      onResetSampleData={handleResetSampleData}
                    />
                  ) : null}

                  <ActiveSection
                    activeSection={activeSection}
                    profile={profile}
                    updateProfile={updateProfile}
                  />
                </>
              ) : (
                <InlineNotice tone="error" title="Profile unavailable">
                  The profile editor could not initialize.
                </InlineNotice>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function WorkspaceSidebar({
  activeSection,
  isDirty,
  profile,
  setActiveSection,
  statusLabel,
  visibilityCounts,
}: {
  activeSection: SectionId;
  isDirty: boolean;
  profile: ResumeProfile | null;
  setActiveSection: (section: SectionId) => void;
  statusLabel: string;
  visibilityCounts: Record<VisibilityStatus, number> | null;
}) {
  return (
    <aside className="flex shrink-0 flex-col border-b border-zinc-200 bg-[#1c1c20] text-zinc-100 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800">
            <Vault size={22} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">ResumeLab</p>
            <p className="truncate text-xs text-zinc-400">Local Profile Vault</p>
          </div>
        </div>
        <StatusDot isDirty={isDirty} label={statusLabel} />
      </div>

      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:overflow-visible lg:px-3 lg:py-3">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              className={`flex h-11 min-w-40 items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition active:translate-y-px lg:min-w-0 ${
                isActive
                  ? "bg-white text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-3">
                <IconComponent size={18} weight={isActive ? "fill" : "regular"} />
                <span className="truncate font-medium">{item.label}</span>
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs ${
                  isActive ? "bg-zinc-100 text-zinc-600" : "bg-zinc-900 text-zinc-400"
                }`}
              >
                {profile ? item.count(profile) : "-"}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-white/[0.06] p-5 lg:block">
        <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
          <Database size={15} />
          Fact status
        </div>
        <div className="grid gap-2 text-sm">
          <SidebarMetric
            label="Resume-ready"
            value={visibilityCounts?.eligible ?? 0}
          />
          <SidebarMetric label="Private" value={visibilityCounts?.private ?? 0} />
          <SidebarMetric
            label="Excluded"
            value={visibilityCounts?.excluded ?? 0}
          />
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400">
          <CloudSlash className="shrink-0 text-zinc-300" size={18} />
          Core profile editing stays local unless a later AI flow is explicitly approved.
        </div>
      </div>
    </aside>
  );
}

function WorkspaceHeader({
  isDirty,
  isLoading,
  onExportJson,
  onResetSampleData,
  onSave,
  saveState,
  statusLabel,
}: {
  isDirty: boolean;
  isLoading: boolean;
  onExportJson: () => void;
  onResetSampleData: () => void;
  onSave: () => void;
  saveState: SaveState;
  statusLabel: string;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600">
              {statusLabel}
            </span>
          </div>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950">
            Local Profile Vault
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
            Maintain canonical career facts before any resume draft or AI workflow
            can cite them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={secondaryButtonClass}
            disabled={isLoading || saveState === "saving"}
            onClick={onResetSampleData}
            type="button"
            title="Load example data to explore the app"
          >
            <ArrowClockwise size={16} />
            Sample data
          </button>
          <button
            className={secondaryButtonClass}
            disabled={isLoading}
            onClick={onExportJson}
            type="button"
            title="Export profile as JSON"
          >
            <DownloadSimple size={16} />
            Export
          </button>
          <BackupRestoreButtons isLoading={isLoading} />
          <button
            className={primaryButtonClass}
            disabled={!isDirty || isLoading || saveState === "saving"}
            onClick={onSave}
            type="button"
          >
            {saveState === "saving" ? (
              <ArrowClockwise className="animate-spin" size={16} />
            ) : (
              <FloppyDisk size={16} />
            )}
            {saveState === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </header>
  );
}

function ActiveSection({
  activeSection,
  profile,
  updateProfile,
}: {
  activeSection: SectionId;
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  switch (activeSection) {
    case "basics":
      return <BasicsSection profile={profile} updateProfile={updateProfile} />;
    case "draft":
      return <ResumeDraftSection profile={profile} />;
    case "experience":
      return <ExperienceSection profile={profile} updateProfile={updateProfile} />;
    case "projects":
      return <ProjectsSection profile={profile} updateProfile={updateProfile} />;
    case "education":
      return <EducationSection profile={profile} updateProfile={updateProfile} />;
    case "skills":
      return <SkillsSection profile={profile} updateProfile={updateProfile} />;
    case "optional":
      return <OptionalSectionsSection profile={profile} updateProfile={updateProfile} />;
    case "privacy":
      return <PrivacySection profile={profile} updateProfile={updateProfile} />;
    default:
      return null;
  }
}

function ResumeDraftSection({ profile }: { profile: ResumeProfile }) {
  const [jobDescription, setJobDescription] = useState("");
  const draft = useMemo(
    () => buildResumeDraft(profile, { jobDescription }),
    [jobDescription, profile],
  );
  const plainText = useMemo(() => renderResumePlainText(draft), [draft]);
  const latex = useMemo(() => renderKhurramsResumeLatex(draft), [draft]);
  const egressPreview = useMemo(
    () => buildAiEgressPreview(profile, jobDescription),
    [jobDescription, profile],
  );

  return (
    <SectionPanel
      action={
        <div className="flex flex-wrap gap-2">
          <button
            className={secondaryButtonClass}
            onClick={() =>
              downloadTextFile(
                createResumeFileName(profile, "txt"),
                plainText,
                "text/plain",
              )
            }
            type="button"
          >
            <DownloadSimple size={16} />
            Export TXT
          </button>
          <button
            className={secondaryButtonClass}
            onClick={() =>
              downloadTextFile(
                createResumeFileName(profile, "tex"),
                latex,
                "application/x-tex",
              )
            }
            type="button"
          >
            <DownloadSimple size={16} />
            Export LaTeX
          </button>
        </div>
      }
      icon={ListChecks}
      subtitle="Generate an ATS-friendly local draft from resume-ready facts and a pasted job description."
      title="Resume Draft"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <TextArea
          label="Job description"
          onChange={setJobDescription}
          placeholder="Paste the role description here."
          value={jobDescription}
        />
        <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-600">Local match score</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-zinc-950">
              {draft.match.score}
              <span className="text-base text-zinc-500">/100</span>
            </p>
          </div>
          <div className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Matched tools</span>
            <span className="text-zinc-600">
              {draft.match.matchedTools.join(", ") || "None yet"}
            </span>
          </div>
          <div className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Missing keywords</span>
            <span className="text-zinc-600">
              {draft.match.missingKeywords.slice(0, 8).join(", ") || "None"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium text-zinc-700">Generated resume text</span>
          <textarea
            className={`${textareaClass} min-h-[28rem] font-mono text-xs leading-5`}
            readOnly
            value={plainText}
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm">
          <span className="font-medium text-zinc-700">Generated LaTeX</span>
          <textarea
            className={`${textareaClass} min-h-[28rem] font-mono text-xs leading-5`}
            readOnly
            value={latex}
          />
        </label>
      </div>

      <label className="grid min-w-0 gap-2 text-sm">
        <span className="font-medium text-zinc-700">AI egress preview</span>
        <textarea
          className={`${textareaClass} min-h-56 font-mono text-xs leading-5`}
          readOnly
          value={egressPreview}
        />
      </label>
    </SectionPanel>
  );
}

function BasicsSection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const updateBasics = <Key extends keyof ProfileBasics>(
    key: Key,
    value: ProfileBasics[Key],
  ) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      basics: {
        ...currentProfile.basics,
        [key]: value,
      },
    }));
  };

  const updateLink = (id: string, patch: Partial<ProfileLink>) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      basics: {
        ...currentProfile.basics,
        links: currentProfile.basics.links.map((link) =>
          link.id === id ? { ...link, ...patch } : link,
        ),
      },
    }));
  };

  return (
    <SectionPanel
      action={
        <VisibilitySelect
          label="Basics visibility"
          onChange={(value) => updateBasics("visibility", value)}
          value={profile.basics.visibility}
        />
      }
      icon={IdentificationCard}
      subtitle="Contact details, headline, links, and profile summary."
      title="Basics"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <TextInput
          label="Full name"
          onChange={(value) => updateBasics("fullName", value)}
          placeholder="Your full name"
          value={profile.basics.fullName}
        />
        <TextInput
          label="Headline"
          onChange={(value) => updateBasics("headline", value)}
          placeholder="Target role or professional headline"
          value={profile.basics.headline}
        />
        <TextInput
          label="Location"
          onChange={(value) => updateBasics("location", value)}
          placeholder="City, state, or remote"
          value={profile.basics.location}
        />
        <TextInput
          label="Email"
          onChange={(value) => updateBasics("email", value)}
          placeholder="you@example.com"
          type="email"
          value={profile.basics.email}
        />
        <TextInput
          label="Phone"
          onChange={(value) => updateBasics("phone", value)}
          placeholder="Phone number"
          value={profile.basics.phone}
        />
        <TextInput
          label="Website"
          onChange={(value) => updateBasics("website", value)}
          placeholder="Personal site or portfolio URL"
          type="url"
          value={profile.basics.website}
        />
      </div>

      <TextArea
        label="Profile summary"
        onChange={(value) => updateBasics("summary", value)}
        placeholder="A concise factual summary of your work focus and strengths."
        value={profile.basics.summary}
      />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">Links</h3>
          <button
            className={secondaryButtonClass}
            onClick={() =>
              updateBasics("links", [
                ...profile.basics.links,
                {
                  id: createProfileId("link"),
                  label: "",
                  url: "",
                  visibility: profile.privacy.defaultVisibility,
                },
              ])
            }
            type="button"
          >
            <Plus size={16} />
            Add link
          </button>
        </div>

        <div className="grid gap-3">
          {profile.basics.links.map((link) => (
            <div
              className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_180px_auto]"
              key={link.id}
            >
              <TextInput
                label="Label"
                onChange={(value) => updateLink(link.id, { label: value })}
                placeholder="Portfolio"
                value={link.label}
              />
              <TextInput
                label="URL"
                onChange={(value) => updateLink(link.id, { url: value })}
                placeholder="https://your-domain.com"
                type="url"
                value={link.url}
              />
              <VisibilitySelect
                label="Visibility"
                onChange={(value) => updateLink(link.id, { visibility: value })}
                value={link.visibility}
              />
              <div className="flex items-end">
                <button
                  aria-label="Remove link"
                  className={dangerButtonClass}
                  onClick={() =>
                    updateBasics(
                      "links",
                      profile.basics.links.filter((item) => item.id !== link.id),
                    )
                  }
                  type="button"
                >
                  <Trash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionPanel>
  );
}

function ExperienceSection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const addExperience = () => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      experience: [
        ...currentProfile.experience,
        {
          ...createEmptyExperience(),
          visibility: currentProfile.privacy.defaultVisibility,
        },
      ],
    }));
  };

  const updateExperience = (id: string, patch: Partial<ExperienceEntry>) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      experience: currentProfile.experience.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  return (
    <SectionPanel
      action={
        <button className={secondaryButtonClass} onClick={addExperience} type="button">
          <Plus size={16} />
          Add experience
        </button>
      }
      icon={Briefcase}
      subtitle="Roles, organizations, date ranges, and truthful impact bullets."
      title="Experience"
    >
      {profile.experience.length === 0 ? (
        <SectionEmpty
          actionLabel="Add experience"
          icon={Briefcase}
          onAction={addExperience}
          title="No experience entries"
        />
      ) : (
        <div className="grid gap-4">
          {profile.experience.map((entry) => (
            <ItemPanel
              key={entry.id}
              onRemove={() =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  experience: currentProfile.experience.filter(
                    (item) => item.id !== entry.id,
                  ),
                }))
              }
              subtitle={entry.company || "Company not set"}
              title={entry.role || "Untitled role"}
              visibility={entry.visibility}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput
                  label="Role"
                  onChange={(value) => updateExperience(entry.id, { role: value })}
                  placeholder="Senior Software Engineer"
                  value={entry.role}
                />
                <TextInput
                  label="Company"
                  onChange={(value) =>
                    updateExperience(entry.id, { company: value })
                  }
                  placeholder="Company or organization"
                  value={entry.company}
                />
                <TextInput
                  label="Location"
                  onChange={(value) =>
                    updateExperience(entry.id, { location: value })
                  }
                  placeholder="City, state, or remote"
                  value={entry.location}
                />
                <VisibilitySelect
                  label="Visibility"
                  onChange={(value) =>
                    updateExperience(entry.id, { visibility: value })
                  }
                  value={entry.visibility}
                />
                <TextInput
                  label="Start date"
                  onChange={(value) =>
                    updateExperience(entry.id, { startDate: value })
                  }
                  placeholder="2022-03"
                  value={entry.startDate}
                />
                <TextInput
                  disabled={entry.isCurrent}
                  label="End date"
                  onChange={(value) =>
                    updateExperience(entry.id, { endDate: value })
                  }
                  placeholder="End date or leave blank"
                  value={entry.isCurrent ? "" : entry.endDate}
                />
              </div>
              <Toggle
                checked={entry.isCurrent}
                label="Current role"
                onChange={(checked) =>
                  updateExperience(entry.id, {
                    endDate: checked ? "" : entry.endDate,
                    isCurrent: checked,
                  })
                }
              />
              <TextArea
                label="Description"
                onChange={(value) =>
                  updateExperience(entry.id, { description: value })
                }
                placeholder="Short factual scope of the role."
                value={entry.description}
              />
              <TextArea
                label="Bullet facts"
                onChange={(value) =>
                  updateExperience(entry.id, { bullets: textToList(value) })
                }
                placeholder="Factual accomplishment with scope, tool, or result."
                value={listToText(entry.bullets)}
              />
              <TextInput
                label="Technologies"
                onChange={(value) =>
                  updateExperience(entry.id, {
                    technologies: commaTextToList(value),
                  })
                }
                placeholder="React, TypeScript, SQLite"
                value={listToCommaText(entry.technologies)}
              />
            </ItemPanel>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}

function ProjectsSection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const addProject = () => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      projects: [
        ...currentProfile.projects,
        {
          ...createEmptyProject(),
          visibility: currentProfile.privacy.defaultVisibility,
        },
      ],
    }));
  };

  const updateProject = (id: string, patch: Partial<ProjectEntry>) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      projects: currentProfile.projects.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  return (
    <SectionPanel
      action={
        <button className={secondaryButtonClass} onClick={addProject} type="button">
          <Plus size={16} />
          Add project
        </button>
      }
      icon={Folders}
      subtitle="Standalone projects, repositories, tools, and evidence bullets."
      title="Projects"
    >
      {profile.projects.length === 0 ? (
        <SectionEmpty
          actionLabel="Add project"
          icon={Folders}
          onAction={addProject}
          title="No projects"
        />
      ) : (
        <div className="grid gap-4">
          {profile.projects.map((entry) => (
            <ItemPanel
              key={entry.id}
              onRemove={() =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  projects: currentProfile.projects.filter(
                    (item) => item.id !== entry.id,
                  ),
                }))
              }
              subtitle={entry.repository || entry.url || "Links not set"}
              title={entry.title || "Untitled project"}
              visibility={entry.visibility}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput
                  label="Project title"
                  onChange={(value) => updateProject(entry.id, { title: value })}
                  placeholder="Project name"
                  value={entry.title}
                />
                <VisibilitySelect
                  label="Visibility"
                  onChange={(value) =>
                    updateProject(entry.id, { visibility: value })
                  }
                  value={entry.visibility}
                />
                <TextInput
                  label="Project URL"
                  onChange={(value) => updateProject(entry.id, { url: value })}
                  placeholder="Project URL"
                  type="url"
                  value={entry.url}
                />
                <TextInput
                  label="Repository"
                  onChange={(value) =>
                    updateProject(entry.id, { repository: value })
                  }
                  placeholder="Repository URL"
                  type="url"
                  value={entry.repository}
                />
                <TextInput
                  label="Start date"
                  onChange={(value) =>
                    updateProject(entry.id, { startDate: value })
                  }
                  placeholder="2024-01"
                  value={entry.startDate}
                />
                <TextInput
                  label="End date"
                  onChange={(value) => updateProject(entry.id, { endDate: value })}
                  placeholder="2024-04"
                  value={entry.endDate}
                />
              </div>
              <TextArea
                label="Description"
                onChange={(value) =>
                  updateProject(entry.id, { description: value })
                }
                placeholder="Short factual project scope."
                value={entry.description}
              />
              <TextArea
                label="Bullet facts"
                onChange={(value) =>
                  updateProject(entry.id, { bullets: textToList(value) })
                }
                placeholder="Factual project result or technical contribution."
                value={listToText(entry.bullets)}
              />
              <TextInput
                label="Technologies"
                onChange={(value) =>
                  updateProject(entry.id, {
                    technologies: commaTextToList(value),
                  })
                }
                placeholder="SQLite, React, Electron"
                value={listToCommaText(entry.technologies)}
              />
            </ItemPanel>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}

function EducationSection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const addEducation = () => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      education: [
        ...currentProfile.education,
        {
          ...createEmptyEducation(),
          visibility: currentProfile.privacy.defaultVisibility,
        },
      ],
    }));
  };

  const updateEducation = (id: string, patch: Partial<EducationEntry>) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      education: currentProfile.education.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  return (
    <SectionPanel
      action={
        <button className={secondaryButtonClass} onClick={addEducation} type="button">
          <Plus size={16} />
          Add education
        </button>
      }
      icon={GraduationCap}
      subtitle="Schools, credentials, fields of study, and relevant notes."
      title="Education"
    >
      {profile.education.length === 0 ? (
        <SectionEmpty
          actionLabel="Add education"
          icon={GraduationCap}
          onAction={addEducation}
          title="No education entries"
        />
      ) : (
        <div className="grid gap-4">
          {profile.education.map((entry) => (
            <ItemPanel
              key={entry.id}
              onRemove={() =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  education: currentProfile.education.filter(
                    (item) => item.id !== entry.id,
                  ),
                }))
              }
              subtitle={entry.degree || entry.field || "Credential not set"}
              title={entry.school || "Untitled school"}
              visibility={entry.visibility}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput
                  label="School"
                  onChange={(value) =>
                    updateEducation(entry.id, { school: value })
                  }
                  placeholder="School or institution"
                  value={entry.school}
                />
                <VisibilitySelect
                  label="Visibility"
                  onChange={(value) =>
                    updateEducation(entry.id, { visibility: value })
                  }
                  value={entry.visibility}
                />
                <TextInput
                  label="Degree"
                  onChange={(value) =>
                    updateEducation(entry.id, { degree: value })
                  }
                  placeholder="B.S."
                  value={entry.degree}
                />
                <TextInput
                  label="Field"
                  onChange={(value) => updateEducation(entry.id, { field: value })}
                  placeholder="Computer Science"
                  value={entry.field}
                />
                <TextInput
                  label="Location"
                  onChange={(value) =>
                    updateEducation(entry.id, { location: value })
                  }
                  placeholder="City, state, or remote"
                  value={entry.location}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Start"
                    onChange={(value) =>
                      updateEducation(entry.id, { startDate: value })
                    }
                    placeholder="2016"
                    value={entry.startDate}
                  />
                  <TextInput
                    label="End"
                    onChange={(value) =>
                      updateEducation(entry.id, { endDate: value })
                    }
                    placeholder="2020"
                    value={entry.endDate}
                  />
                </div>
              </div>
              <TextArea
                label="Notes"
                onChange={(value) => updateEducation(entry.id, { notes: value })}
                placeholder="Coursework, honors, thesis, or relevant academic details."
                value={entry.notes}
              />
            </ItemPanel>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}

function SkillsSection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const addSkillGroup = () => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      skills: [
        ...currentProfile.skills,
        {
          ...createEmptySkillGroup(),
          visibility: currentProfile.privacy.defaultVisibility,
        },
      ],
    }));
  };

  const updateSkillGroup = (id: string, patch: Partial<SkillGroup>) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      skills: currentProfile.skills.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  return (
    <SectionPanel
      action={
        <button className={secondaryButtonClass} onClick={addSkillGroup} type="button">
          <Plus size={16} />
          Add skill group
        </button>
      }
      icon={Stack}
      subtitle="Grouped skills, context, and related profile fact identifiers."
      title="Skills"
    >
      {profile.skills.length === 0 ? (
        <SectionEmpty
          actionLabel="Add skill group"
          icon={Stack}
          onAction={addSkillGroup}
          title="No skill groups"
        />
      ) : (
        <div className="grid gap-4">
          {profile.skills.map((entry) => (
            <ItemPanel
              key={entry.id}
              onRemove={() =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  skills: currentProfile.skills.filter(
                    (item) => item.id !== entry.id,
                  ),
                }))
              }
              subtitle={entry.skills.join(", ") || "Skills not set"}
              title={entry.category || "Untitled skill group"}
              visibility={entry.visibility}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <TextInput
                  label="Category"
                  onChange={(value) =>
                    updateSkillGroup(entry.id, { category: value })
                  }
                  placeholder="Frontend"
                  value={entry.category}
                />
                <VisibilitySelect
                  label="Visibility"
                  onChange={(value) =>
                    updateSkillGroup(entry.id, { visibility: value })
                  }
                  value={entry.visibility}
                />
                <TextInput
                  label="Skills"
                  onChange={(value) =>
                    updateSkillGroup(entry.id, {
                      skills: commaTextToList(value),
                    })
                  }
                  placeholder="React, TypeScript, Accessibility"
                  value={listToCommaText(entry.skills)}
                />
                <TextInput
                  label="Related fact IDs"
                  onChange={(value) =>
                    updateSkillGroup(entry.id, {
                      relatedFactIds: commaTextToList(value),
                    })
                  }
                  placeholder="experience-..., project-..."
                  value={listToCommaText(entry.relatedFactIds)}
                />
              </div>
              <TextArea
                label="Context"
                onChange={(value) =>
                  updateSkillGroup(entry.id, { context: value })
                }
                placeholder="Where this skill has been used and how it should be framed."
                value={entry.context}
              />
            </ItemPanel>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}

function OptionalSectionsSection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const addOptionalSection = () => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      optionalSections: [
        ...currentProfile.optionalSections,
        {
          ...createEmptyOptionalSection(),
          visibility: currentProfile.privacy.defaultVisibility,
        },
      ],
    }));
  };

  const updateOptionalSection = (
    id: string,
    patch: Partial<OptionalSection>,
  ) => {
    updateProfile((currentProfile) => ({
      ...currentProfile,
      optionalSections: currentProfile.optionalSections.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  return (
    <SectionPanel
      action={
        <button
          className={secondaryButtonClass}
          onClick={addOptionalSection}
          type="button"
        >
          <Plus size={16} />
          Add optional item
        </button>
      }
      icon={FileText}
      subtitle="Certifications, awards, publications, volunteer work, and custom facts."
      title="Optional Sections"
    >
      {profile.optionalSections.length === 0 ? (
        <SectionEmpty
          actionLabel="Add optional item"
          icon={FileText}
          onAction={addOptionalSection}
          title="No optional sections"
        />
      ) : (
        <div className="grid gap-4">
          {profile.optionalSections.map((entry) => (
            <ItemPanel
              key={entry.id}
              onRemove={() =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  optionalSections: currentProfile.optionalSections.filter(
                    (item) => item.id !== entry.id,
                  ),
                }))
              }
              subtitle={entry.organization || entry.type}
              title={entry.title || "Untitled optional item"}
              visibility={entry.visibility}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <SelectInput
                  label="Type"
                  onChange={(value) =>
                    updateOptionalSection(entry.id, { type: value })
                  }
                  options={[
                    "Certification",
                    "Award",
                    "Publication",
                    "Volunteer",
                    "Custom",
                  ]}
                  value={entry.type}
                />
                <VisibilitySelect
                  label="Visibility"
                  onChange={(value) =>
                    updateOptionalSection(entry.id, { visibility: value })
                  }
                  value={entry.visibility}
                />
                <TextInput
                  label="Title"
                  onChange={(value) =>
                    updateOptionalSection(entry.id, { title: value })
                  }
                  placeholder="Certification, award, publication, or custom item"
                  value={entry.title}
                />
                <TextInput
                  label="Organization"
                  onChange={(value) =>
                    updateOptionalSection(entry.id, { organization: value })
                  }
                  placeholder="Issuing organization"
                  value={entry.organization}
                />
                <TextInput
                  label="Date"
                  onChange={(value) =>
                    updateOptionalSection(entry.id, { date: value })
                  }
                  placeholder="2023"
                  value={entry.date}
                />
              </div>
              <TextArea
                label="Description"
                onChange={(value) =>
                  updateOptionalSection(entry.id, { description: value })
                }
                placeholder="Short factual context."
                value={entry.description}
              />
              <TextArea
                label="Bullet facts"
                onChange={(value) =>
                  updateOptionalSection(entry.id, { bullets: textToList(value) })
                }
                placeholder="Factual detail that can be reused in a resume."
                value={listToText(entry.bullets)}
              />
            </ItemPanel>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}

function PrivacySection({
  profile,
  updateProfile,
}: {
  profile: ResumeProfile;
  updateProfile: (updater: (profile: ResumeProfile) => ResumeProfile) => void;
}) {
  const counts = countVisibility(profile);

  return (
    <SectionPanel
      icon={ShieldCheck}
      subtitle="Default fact eligibility, private facts, and outbound AI safeguards."
      title="Privacy"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Default visibility for new facts
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {visibilityOptions.map((option) => {
                const isSelected =
                  profile.privacy.defaultVisibility === option.value;
                const IconComponent = visibilityIcons[option.value];

                return (
                  <button
                    className={`min-h-28 rounded-md border p-3 text-left transition active:translate-y-px ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300"
                    }`}
                    key={option.value}
                    onClick={() =>
                      updateProfile((currentProfile) => ({
                        ...currentProfile,
                        privacy: {
                          ...currentProfile.privacy,
                          defaultVisibility: option.value,
                        },
                      }))
                    }
                    type="button"
                  >
                    <IconComponent size={19} />
                    <span className="mt-3 block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${
                        isSelected ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4">
            <Toggle
              checked={profile.privacy.requireAiEgressReview}
              label="Require AI egress review"
              onChange={(checked) =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  privacy: {
                    ...currentProfile.privacy,
                    requireAiEgressReview: checked,
                  },
                }))
              }
            />
            <Toggle
              checked={profile.privacy.keepContactPrivateByDefault}
              label="Keep contact details private by default"
              onChange={(checked) =>
                updateProfile((currentProfile) => ({
                  ...currentProfile,
                  privacy: {
                    ...currentProfile.privacy,
                    keepContactPrivateByDefault: checked,
                  },
                }))
              }
            />
          </div>

          <TextArea
            label="Privacy notes"
            onChange={(value) =>
              updateProfile((currentProfile) => ({
                ...currentProfile,
                privacy: {
                  ...currentProfile.privacy,
                  notes: value,
                },
              }))
            }
            placeholder="Personal handling notes for sensitive facts or provider egress."
            value={profile.privacy.notes}
          />
        </div>

        <div className="grid content-start gap-3">
          <PrivacyMetric
            count={counts.eligible}
            icon={Eye}
            label="Resume-ready facts"
            visibility="eligible"
          />
          <PrivacyMetric
            count={counts.private}
            icon={EyeSlash}
            label="Private facts"
            visibility="private"
          />
          <PrivacyMetric
            count={counts.excluded}
            icon={Prohibit}
            label="Excluded facts"
            visibility="excluded"
          />
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            <div className="mb-2 flex items-center gap-2 font-semibold text-zinc-900">
              <LockKey size={18} />
              Local-first boundary
            </div>
            Profile facts are edited here as canonical local data. Later AI
            tailoring should read only the facts approved by these visibility
            statuses.
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}

function SectionPanel({
  action,
  children,
  icon: IconComponent,
  subtitle,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
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
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
              {subtitle}
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="grid gap-5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ItemPanel({
  children,
  onRemove,
  subtitle,
  title,
  visibility,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  subtitle: string;
  title: string;
  visibility: VisibilityStatus;
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-zinc-950">
              {title}
            </h3>
            <VisibilityBadge visibility={visibility} />
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">{subtitle}</p>
        </div>
        <button className={dangerButtonClass} onClick={onRemove} type="button">
          <Trash size={15} />
          Remove
        </button>
      </div>
      <div className="grid gap-4 p-4">{children}</div>
    </article>
  );
}

function TextInput({
  disabled,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className={inputClass}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea
        className={textareaClass}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisibilitySelect({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: VisibilityStatus) => void;
  value: VisibilityStatus;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className={inputClass}
        onChange={(event) => onChange(event.target.value as VisibilityStatus)}
        value={value}
      >
        {visibilityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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

function VisibilityBadge({ visibility }: { visibility: VisibilityStatus }) {
  const option = visibilityOptions.find((item) => item.value === visibility);
  const IconComponent = visibilityIcons[visibility];

  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium ${visibilityStyles[visibility]}`}
    >
      <IconComponent size={14} />
      {option?.label ?? visibility}
    </span>
  );
}

function SectionEmpty({
  actionLabel,
  icon: IconComponent,
  onAction,
  title,
}: {
  actionLabel: string;
  icon: Icon;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600">
          <IconComponent size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{title}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add a verified fact before it can appear in a resume draft.
          </p>
        </div>
      </div>
      <button className={secondaryButtonClass} onClick={onAction} type="button">
        <Plus size={16} />
        {actionLabel}
      </button>
    </div>
  );
}

function EmptyProfileBanner({
  onAddBasics,
  onResetSampleData,
}: {
  onAddBasics: () => void;
  onResetSampleData: () => void;
}) {
  return (
    <section className="rounded-xl border border-dashed border-zinc-300 bg-gradient-to-b from-white to-zinc-50 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <ListChecks size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900">
              Welcome to your Profile Vault
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
              Start by filling in your contact info and work history. Every fact you add here becomes
              a building block for tailored resumes. Try loading sample data to explore.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button className={secondaryButtonClass} onClick={onAddBasics} type="button">
            <IdentificationCard size={16} />
            Start with basics
          </button>
          <button
            className={primaryButtonClass}
            onClick={onResetSampleData}
            type="button"
          >
            <ArrowClockwise size={16} />
            Load sample data
          </button>
        </div>
      </div>
    </section>
  );
}

function InlineNotice({
  children,
  title,
  tone,
}: {
  children: React.ReactNode;
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

function LoadingProfileState() {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="animate-pulse">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-zinc-200" />
          <div className="grid flex-1 gap-2">
            <div className="h-4 w-48 rounded bg-zinc-200" />
            <div className="h-3 w-72 max-w-full rounded bg-zinc-100" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="h-10 rounded-md bg-zinc-100" />
          <div className="h-10 rounded-md bg-zinc-100" />
          <div className="h-10 rounded-md bg-zinc-100" />
          <div className="h-10 rounded-md bg-zinc-100" />
        </div>
        <div className="mt-4 h-32 rounded-md bg-zinc-100" />
      </div>
    </section>
  );
}

function StatusDot({ isDirty, label }: { isDirty: boolean; label: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300">
      <span
        className={`size-2 rounded-full ${
          isDirty ? "bg-amber-400" : "bg-emerald-400"
        }`}
      />
      <span className="hidden sm:inline lg:hidden xl:inline">{label}</span>
    </div>
  );
}

function SidebarMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-zinc-300">
      <span className="truncate">{label}</span>
      <span className="font-mono text-zinc-100">{value}</span>
    </div>
  );
}

function PrivacyMetric({
  count,
  icon: IconComponent,
  label,
  visibility,
}: {
  count: number;
  icon: Icon;
  label: string;
  visibility: VisibilityStatus;
}) {
  return (
    <div className={`rounded-md border p-4 ${visibilityStyles[visibility]}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <IconComponent className="shrink-0" size={18} />
          <span className="truncate text-sm font-medium">{label}</span>
        </div>
        <span className="font-mono text-lg font-semibold">{count}</span>
      </div>
    </div>
  );
}





function BackupRestoreButtons({ isLoading }: { isLoading: boolean }) {
  const [isWorking, setIsWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleExport = async () => {
    if (!window.resumelab?.backup?.exportBackup) return;
    setIsWorking(true);
    setNotice(null);
    try {
      const result = await window.resumelab.backup.exportBackup();
      if (!result.canceled) {
        setNotice(`Backup saved to ${result.filePath}`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Backup export failed.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleImport = async () => {
    if (!window.resumelab?.backup?.importBackup) return;
    const confirmed = window.confirm(
      "Importing a backup will overwrite current data. Continue?"
    );
    if (!confirmed) return;
    setIsWorking(true);
    setNotice(null);
    try {
      const result = await window.resumelab.backup.importBackup();
      if (!result.canceled) {
        setNotice(`Imported ${result.imported} records. Reload to see changes.`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Backup import failed.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        className={secondaryButtonClass}
        disabled={isLoading || isWorking}
        onClick={handleExport}
        type="button"
        title="Save all data to a backup file"
      >
        <DownloadSimple size={16} />
        Backup
      </button>
      <button
        className={secondaryButtonClass}
        disabled={isLoading || isWorking}
        onClick={handleImport}
        type="button"
        title="Restore data from a backup file"
      >
        <UploadSimple size={16} />
        Restore
      </button>
      {notice ? (
        <span className="ml-2 text-xs text-zinc-500">{notice}</span>
      ) : null}
    </div>
  );
}


