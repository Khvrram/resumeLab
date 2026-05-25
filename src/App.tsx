import { useEffect, useState } from "react";
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
    label: "Library",
    description: "Jobs and models",
    icon: FileText,
  },
];

const workspaceModeStorageKey = "resumelab.workspace.mode";

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

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(
    getInitialWorkspaceMode,
  );

  useEffect(() => {
    window.localStorage.setItem(workspaceModeStorageKey, workspaceMode);
  }, [workspaceMode]);

  return (
    <div className="min-h-[100dvh] bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              ResumeLab
            </p>
            <p className="truncate text-xs text-zinc-500">
              Local-first tailoring workspace
            </p>
          </div>

          <div
            aria-label="Workspace mode"
            className="grid grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1 sm:grid-cols-4"
            role="tablist"
          >
            {workspaceModeOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = workspaceMode === option.id;

              return (
                <button
                  aria-selected={isActive}
                  className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 text-left transition active:translate-y-px sm:min-w-36 ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-sm"
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
                    <span className="block truncate text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
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
        />
      ) : workspaceMode === "editor" ? (
        <ResumeEditorWorkspace />
      ) : workspaceMode === "profile" ? (
        <ProfileVaultWorkspace />
      ) : (
        <V2Workspace />
      )}
    </div>
  );
}
