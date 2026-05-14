import {
  createSampleProfile,
  isResumeProfile,
  type ResumeProfile,
} from "../domain/profile";

export const PROFILE_STORAGE_KEY = "resumelab.profile.v1";

export interface ProfileRepository {
  load(): Promise<ResumeProfile>;
  save(profile: ResumeProfile): Promise<void>;
  reset(): Promise<ResumeProfile>;
  exportJson(): Promise<string>;
}

export function createProfileRepository(
  storage: Storage = getDefaultStorage(),
): ProfileRepository {
  async function load(): Promise<ResumeProfile> {
    const storedProfile = storage.getItem(PROFILE_STORAGE_KEY);

    if (storedProfile === null) {
      const seededProfile = createSampleProfile();
      storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(seededProfile));
      return cloneProfile(seededProfile);
    }

    return deserializeProfile(storedProfile);
  }

  async function save(profile: ResumeProfile): Promise<void> {
    storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(profile));
  }

  async function reset(): Promise<ResumeProfile> {
    storage.removeItem(PROFILE_STORAGE_KEY);
    return load();
  }

  async function exportJson(): Promise<string> {
    const profile = await load();
    return serializeProfile(profile);
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

function serializeProfile(profile: ResumeProfile): string {
  return JSON.stringify(profile, null, 2);
}

function deserializeProfile(serializedProfile: string): ResumeProfile {
  const parsedProfile = parseJson(serializedProfile);

  if (!isResumeProfile(parsedProfile)) {
    throw new Error("Stored profile does not match ResumeProfile schema v1.");
  }

  return parsedProfile;
}

function cloneProfile(profile: ResumeProfile): ResumeProfile {
  return deserializeProfile(serializeProfile(profile));
}

function parseJson(serializedProfile: string): unknown {
  try {
    const parsed: unknown = JSON.parse(serializedProfile);
    return parsed;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new Error(`Stored profile JSON is invalid: ${message}`);
  }
}
