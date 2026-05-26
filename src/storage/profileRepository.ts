import {
  createEmptyProfile,
  isResumeProfile,
  type ResumeProfile,
} from "../domain/profile";
import { getDefaultJsonStorage, type JsonStorage } from "./jsonStorage";

export const PROFILE_STORAGE_KEY = "resumelab.profile.v1";

export interface ProfileRepository {
  load(): Promise<ResumeProfile>;
  save(profile: ResumeProfile): Promise<void>;
  reset(profile?: ResumeProfile): Promise<ResumeProfile>;
  exportJson(): Promise<string>;
}

export function createProfileRepository(
  storage: JsonStorage = getDefaultJsonStorage(),
): ProfileRepository {
  async function load(): Promise<ResumeProfile> {
    const storedProfile = await storage.getItem(PROFILE_STORAGE_KEY);

    if (storedProfile === null) {
      const emptyProfile = createEmptyProfile();
      await storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(emptyProfile));
      return cloneProfile(emptyProfile);
    }

    return deserializeProfile(storedProfile);
  }

  async function save(profile: ResumeProfile): Promise<void> {
    await storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(profile));
  }

  async function reset(
    profile: ResumeProfile = createEmptyProfile(),
  ): Promise<ResumeProfile> {
    await save(profile);
    return cloneProfile(profile);
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
