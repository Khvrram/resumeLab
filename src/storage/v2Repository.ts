import {
  createSampleV2Workspace,
  isV2WorkspaceState,
  type V2WorkspaceState,
} from "../domain/v2";

export const V2_STORAGE_KEY = "resumelab.workspace.v2";

export interface V2Repository {
  load(): Promise<V2WorkspaceState>;
  save(state: V2WorkspaceState): Promise<void>;
  reset(): Promise<V2WorkspaceState>;
  exportJson(): Promise<string>;
}

export function createV2Repository(
  storage: Storage = getDefaultStorage(),
): V2Repository {
  async function load(): Promise<V2WorkspaceState> {
    const storedWorkspace = storage.getItem(V2_STORAGE_KEY);

    if (storedWorkspace === null) {
      const seededWorkspace = createSampleV2Workspace();
      storage.setItem(V2_STORAGE_KEY, serializeWorkspace(seededWorkspace));
      return cloneWorkspace(seededWorkspace);
    }

    return deserializeWorkspace(storedWorkspace);
  }

  async function save(state: V2WorkspaceState): Promise<void> {
    storage.setItem(V2_STORAGE_KEY, serializeWorkspace(state));
  }

  async function reset(): Promise<V2WorkspaceState> {
    storage.removeItem(V2_STORAGE_KEY);
    return load();
  }

  async function exportJson(): Promise<string> {
    const state = await load();
    return serializeWorkspace(state);
  }

  return {
    load,
    save,
    reset,
    exportJson,
  };
}

function getDefaultStorage(): Storage {
  if (typeof globalThis.localStorage === "undefined") {
    throw new Error(
      "No Storage implementation was provided and localStorage is unavailable.",
    );
  }

  return globalThis.localStorage;
}

function serializeWorkspace(state: V2WorkspaceState): string {
  return JSON.stringify(state, null, 2);
}

function deserializeWorkspace(serializedWorkspace: string): V2WorkspaceState {
  const parsedWorkspace = parseJson(serializedWorkspace);

  if (!isV2WorkspaceState(parsedWorkspace)) {
    throw new Error(
      "Stored v2 workspace does not match V2WorkspaceState schema v1.",
    );
  }

  return parsedWorkspace;
}

function cloneWorkspace(state: V2WorkspaceState): V2WorkspaceState {
  return deserializeWorkspace(serializeWorkspace(state));
}

function parseJson(serializedWorkspace: string): unknown {
  try {
    const parsed: unknown = JSON.parse(serializedWorkspace);
    return parsed;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new Error(`Stored v2 workspace JSON is invalid: ${message}`);
  }
}
