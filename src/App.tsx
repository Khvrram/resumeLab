import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Database,
  FileText,
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
    description: "Tailor inputs",
    icon: Briefcase,
  },
  {
    id: "editor",
    label: "Editor",
    description: "Live resume",
    icon: NotePencil,
  },
  {
    id: "profile",
    label: "Profile",
    description: "Career facts",
    icon: Database,
  },
  {
    id: "library",
    label: "Jobs",
    description: "Targets and templates",
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
      className={`min-h-[100dvh] text-zinc-950 ${
        isEditorMode ? "bg-zinc-950" : "bg-zinc-100"
      }`}
    >
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur ${
          isEditorMode
            ? "border-white/10 bg-zinc-950/95 text-white"
            : "border-zinc-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex max-w-[1720px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold ${
                isEditorMode ? "text-white" : "text-zinc-950"
              }`}
            >
              ResumeLab
            </p>
            <p
              className={`truncate text-xs ${
                isEditorMode ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              {isEditorMode
                ? "Dedicated resume editor"
                : "Local-first tailoring workspace"}
            </p>
          </div>

          <div
            aria-label="Workspace mode"
            className={`grid grid-cols-4 gap-1 rounded-md border p-1 ${
              isEditorMode
                ? "border-white/10 bg-white/5"
                : "border-zinc-200 bg-zinc-100"
            }`}
            role="tablist"
          >
            {workspaceModeOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = workspaceMode === option.id;

              return (
                <button
                  aria-selected={isActive}
                  className={`flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-left transition active:translate-y-px sm:justify-start sm:px-3 md:min-w-36 ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-sm"
                      : isEditorMode
                        ? "text-zinc-400 hover:bg-white/10 hover:text-white"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                  }`}
                  key={option.id}
                  onClick={() => setWorkspaceMode(option.id)}
                  role="tab"
                  type="button"
                >
                  <IconComponent
                    size={18}
                    weight={isActive ? "fill" : "regular"}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium sm:text-sm">
                      {option.label}
                    </span>
                    <span
                      className={`hidden truncate text-xs sm:block ${
                        isActive
                          ? "text-zinc-500"
                          : isEditorMode
                            ? "text-zinc-500"
                            : "text-zinc-500"
                      }`}
                    >
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

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
  );
}
