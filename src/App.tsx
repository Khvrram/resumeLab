import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Database,
  FileText,
  Gear,
  House,
  NotePencil,
  type Icon,
} from "@phosphor-icons/react";
import { ProfileVaultWorkspace } from "./components/ProfileVaultWorkspace";
import { ResumeEditorWorkspace } from "./components/ResumeEditorWorkspace";
import { ResumeStudioWorkspace } from "./components/ResumeStudioWorkspace";
import { V2Workspace } from "./components/V2Workspace";

type WorkspaceMode = "studio" | "editor" | "profile" | "library";

type WorkspaceModeOption = {
  id: WorkspaceMode;
  label: string;
  description: string;
  icon: Icon;
};

const workspaceModeOptions: WorkspaceModeOption[] = [
  {
    id: "studio",
    label: "Studio",
    description: "Tailor for a job",
    icon: Briefcase,
  },
  {
    id: "editor",
    label: "Editor",
    description: "Resume document",
    icon: NotePencil,
  },
  {
    id: "profile",
    label: "Profile",
    description: "Career vault",
    icon: Database,
  },
  {
    id: "library",
    label: "Library",
    description: "Jobs & templates",
    icon: FileText,
  },
];

const workspaceModeStorageKey = "resumelab.workspace.mode";
const selectedJobStorageKey = "resumelab.workspace.selectedJobId";

const getInitialWorkspaceMode = (): WorkspaceMode => {
  if (typeof window === "undefined") {
    return "studio";
  }

  const storedMode = window.localStorage.getItem(workspaceModeStorageKey);

  return storedMode === "editor" ||
    storedMode === "profile" ||
    storedMode === "library"
    ? storedMode
    : "studio";
};

const getInitialSelectedJobId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(selectedJobStorageKey);
};

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(
    getInitialWorkspaceMode,
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    getInitialSelectedJobId,
  );

  const handleSelectJob = useCallback((jobId: string | null) => {
    setSelectedJobId(jobId);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(workspaceModeStorageKey, workspaceMode);
  }, [workspaceMode]);

  useEffect(() => {
    if (selectedJobId) {
      window.localStorage.setItem(selectedJobStorageKey, selectedJobId);
    } else {
      window.localStorage.removeItem(selectedJobStorageKey);
    }
  }, [selectedJobId]);

  const isEditorMode = workspaceMode === "editor";

  return (
    <div
      className={`flex min-h-[100dvh] flex-col text-zinc-900 ${
        isEditorMode ? "bg-zinc-950" : "bg-zinc-50"
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-sm ${
          isEditorMode
            ? "border-white/[0.08] bg-zinc-950/95 text-white"
            : "border-zinc-200/80 bg-white/95"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-5 px-5">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div
              className={`flex size-7 items-center justify-center rounded-md text-[0.65rem] font-bold tracking-wider ${
                isEditorMode
                  ? "bg-white/10 text-white"
                  : "bg-zinc-900 text-white"
              }`}
            >
              RL
            </div>
            <div>
              <p
                className={`text-[0.8rem] font-semibold leading-none tracking-tight ${
                  isEditorMode ? "text-white" : "text-zinc-900"
                }`}
              >
                ResumeLab
              </p>
              <p
                className={`mt-0.5 text-[0.65rem] leading-none ${
                  isEditorMode ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                Local-first resume editor
              </p>
            </div>
          </div>

          {/* Nav separator */}
          <div
            className={`mx-1 h-5 w-px ${
              isEditorMode ? "bg-white/10" : "bg-zinc-200"
            }`}
          />

          {/* Navigation */}
          <nav
            aria-label="Workspace"
            className="flex gap-0.5"
            role="tablist"
          >
            {workspaceModeOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = workspaceMode === option.id;

              return (
                <button
                  aria-selected={isActive}
                  className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[0.8rem] font-medium transition-all ${
                    isActive
                      ? isEditorMode
                        ? "bg-white/[0.12] text-white"
                        : "bg-zinc-100 text-zinc-900"
                      : isEditorMode
                        ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                  }`}
                  key={option.id}
                  onClick={() => setWorkspaceMode(option.id)}
                  role="tab"
                  title={`${option.label} \u2014 ${option.description}`}
                  type="button"
                >
                  <IconComponent
                    size={16}
                    weight={isActive ? "fill" : "regular"}
                  />
                  {option.label}
                </button>
              );
            })}
          </nav>

          {/* Right side spacer */}
          <div className="flex-1" />

          {/* Status indicator */}
          <StatusPill isEditorMode={isEditorMode} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {workspaceMode === "studio" ? (
          <ResumeStudioWorkspace
            onOpenEditor={() => setWorkspaceMode("editor")}
            onOpenLibrary={() => setWorkspaceMode("library")}
            onOpenProfile={() => setWorkspaceMode("profile")}
            onSelectJob={handleSelectJob}
            selectedJobId={selectedJobId}
          />
        ) : workspaceMode === "editor" ? (
          <ResumeEditorWorkspace
            onOpenProfile={() => setWorkspaceMode("profile")}
            onOpenStudio={() => setWorkspaceMode("studio")}
            onSelectJob={handleSelectJob}
            selectedJobId={selectedJobId}
          />
        ) : workspaceMode === "profile" ? (
          <ProfileVaultWorkspace />
        ) : (
          <V2Workspace />
        )}
      </div>
    </div>
  );
}

function StatusPill({ isEditorMode }: { isEditorMode: boolean }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.68rem] font-medium ${
        isEditorMode ? "text-zinc-500" : "text-zinc-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          isOnline ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      {isOnline ? "Local" : "Offline"}
    </div>
  );
}

