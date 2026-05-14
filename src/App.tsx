import { useEffect, useState } from "react";
import { Flask, Vault, type Icon } from "@phosphor-icons/react";
import { ProfileVaultWorkspace } from "./components/ProfileVaultWorkspace";
import { V2Workspace } from "./components/V2Workspace";

type WorkspaceMode = "profile" | "v2";

type WorkspaceModeOption = {
  id: WorkspaceMode;
  label: string;
  description: string;
  icon: Icon;
};

const workspaceModeOptions: WorkspaceModeOption[] = [
  {
    id: "profile",
    label: "Profile Vault",
    description: "Canonical career facts",
    icon: Vault,
  },
  {
    id: "v2",
    label: "V2 Lab",
    description: "Templates, jobs, prompts",
    icon: Flask,
  },
];

const workspaceModeStorageKey = "resumelab.workspace.mode";

const getInitialWorkspaceMode = (): WorkspaceMode => {
  if (typeof window === "undefined") {
    return "profile";
  }

  const storedMode = window.localStorage.getItem(workspaceModeStorageKey);

  return storedMode === "v2" ? "v2" : "profile";
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
              Local-first resume workspace
            </p>
          </div>

          <div
            aria-label="Workspace mode"
            className="grid gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1 sm:grid-cols-2"
            role="tablist"
          >
            {workspaceModeOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = workspaceMode === option.id;

              return (
                <button
                  aria-selected={isActive}
                  className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 text-left transition active:translate-y-px sm:min-w-44 ${
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

      {workspaceMode === "profile" ? <ProfileVaultWorkspace /> : <V2Workspace />}
    </div>
  );
}
