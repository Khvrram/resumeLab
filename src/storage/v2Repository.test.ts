import { describe, expect, it } from "vitest";
import {
  createSampleV2Workspace,
  type V2WorkspaceState,
} from "../domain/v2";
import { createV2Repository, V2_STORAGE_KEY } from "./v2Repository";

describe("v2Repository", () => {
  it("seeds the sample v2 workspace when nothing is stored", async () => {
    const storage = new MemoryStorage();
    const repository = createV2Repository(storage);

    const state = await repository.load();

    expect(state).toEqual(createSampleV2Workspace());
    expect(readStoredWorkspace(storage)).toEqual(createSampleV2Workspace());
  });

  it("loads a saved workspace without reseeding", async () => {
    const storage = new MemoryStorage();
    const repository = createV2Repository(storage);
    const savedState = createCustomWorkspace();

    await repository.save(savedState);

    expect(await repository.load()).toEqual(savedState);
    expect(readStoredWorkspace(storage)).toEqual(savedState);
  });

  it("persists saved workspace changes", async () => {
    const storage = new MemoryStorage();
    const repository = createV2Repository(storage);
    const state = createCustomWorkspace();
    const updatedState: V2WorkspaceState = {
      ...state,
      updatedAt: "2026-05-14T17:00:00.000Z",
      jobApplications: state.jobApplications.map((jobApplication) =>
        jobApplication.id === "job_custom_local_first_desktop"
          ? {
              ...jobApplication,
              status: "applied",
              notes:
                "Submitted with the ATS Classic template and a concise cover letter.",
            }
          : jobApplication,
      ),
    };

    await repository.save(updatedState);

    expect(await repository.load()).toEqual(updatedState);
  });

  it("resets storage back to the seeded sample workspace", async () => {
    const storage = new MemoryStorage();
    const repository = createV2Repository(storage);

    await repository.save(createCustomWorkspace());

    const resetState = await repository.reset();

    expect(resetState).toEqual(createSampleV2Workspace());
    expect(readStoredWorkspace(storage)).toEqual(createSampleV2Workspace());
  });

  it("exports the current workspace as formatted JSON", async () => {
    const storage = new MemoryStorage();
    const repository = createV2Repository(storage);
    const savedState = createCustomWorkspace();

    await repository.save(savedState);

    const exportedJson = await repository.exportJson();
    const exportedState: unknown = JSON.parse(exportedJson);

    expect(exportedState).toEqual(savedState);
    expect(exportedJson).toBe(JSON.stringify(savedState, null, 2));
  });

  it("throws without reseeding when stored JSON is invalid", async () => {
    const storage = new MemoryStorage();
    storage.setItem(V2_STORAGE_KEY, "{ invalid json");
    const repository = createV2Repository(storage);

    await expect(repository.load()).rejects.toThrow(
      /Stored v2 workspace JSON is invalid/,
    );
    expect(storage.getItem(V2_STORAGE_KEY)).toBe("{ invalid json");
  });

  it("throws without reseeding when stored data does not match the schema", async () => {
    const storage = new MemoryStorage();
    const malformedState = {
      schemaVersion: 1,
      id: "v2_workspace_malformed",
      createdAt: "2026-05-14T00:00:00.000Z",
      updatedAt: "2026-05-14T00:00:00.000Z",
      templates: "not an array",
    };
    storage.setItem(V2_STORAGE_KEY, JSON.stringify(malformedState));
    const repository = createV2Repository(storage);

    await expect(repository.load()).rejects.toThrow(
      /Stored v2 workspace does not match V2WorkspaceState schema v1/,
    );
    expect(readStoredWorkspace(storage)).toEqual(malformedState);
  });
});

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

function createCustomWorkspace(): V2WorkspaceState {
  const sample = createSampleV2Workspace();
  const civicFormsJob = sample.jobApplications[0];

  return {
    ...sample,
    id: "v2_workspace_custom",
    updatedAt: "2026-05-14T16:30:00.000Z",
    templates: sample.templates.map((template) =>
      template.id === "template_ats_classic_latex"
        ? {
            ...template,
            id: "template_custom_ats_classic",
            name: "Custom ATS Classic",
            source: "custom",
            tags: [...template.tags, "customized"],
          }
        : template,
    ),
    jobApplications: [
      {
        ...civicFormsJob,
        id: "job_custom_local_first_desktop",
        roleTitle: "Local-First Desktop Engineer",
        company: "ResumeLab Studio",
        status: "tailoring",
        notes:
          "Use this custom state to verify persisted v2 job tracker changes.",
        statusHistory: [
          ...civicFormsJob.statusHistory,
          {
            status: "tailoring",
            at: "2026-05-14T16:00:00.000Z",
            note: "Custom repository test state entered tailoring.",
          },
        ],
      },
    ],
    promptProfiles: sample.promptProfiles.map((promptProfile) =>
      promptProfile.id === "prompt_profile_truthful_tailoring"
        ? {
            ...promptProfile,
            name: "Custom truth-preserving tailoring",
            tags: [...promptProfile.tags, "custom"],
          }
        : promptProfile,
    ),
    localModelEndpoints: sample.localModelEndpoints.map((endpoint) =>
      endpoint.id === "local_endpoint_ollama"
        ? {
            ...endpoint,
            readiness: "ready",
            lastCheckedAt: "2026-05-14T16:20:00.000Z",
          }
        : endpoint,
    ),
  };
}

function readStoredWorkspace(storage: Storage): unknown {
  const storedWorkspace = storage.getItem(V2_STORAGE_KEY);

  if (storedWorkspace === null) {
    return null;
  }

  const parsedWorkspace: unknown = JSON.parse(storedWorkspace);
  return parsedWorkspace;
}
