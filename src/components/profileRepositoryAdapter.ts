import {
  createSampleProfile,
  normalizeProfile,
  toRepositoryProfile,
  type ResumeProfile,
} from "./profileTypes";

type ProfileRepository = {
  loadProfile?: () => Promise<unknown> | unknown;
  getProfile?: () => Promise<unknown> | unknown;
  getOrCreateProfile?: () => Promise<unknown> | unknown;
  load?: () => Promise<unknown> | unknown;
  get?: () => Promise<unknown> | unknown;
  read?: () => Promise<unknown> | unknown;
  current?: () => Promise<unknown> | unknown;
  saveProfile?: (profile: unknown) => Promise<unknown> | unknown;
  upsertProfile?: (profile: unknown) => Promise<unknown> | unknown;
  updateProfile?: (profile: unknown) => Promise<unknown> | unknown;
  save?: (profile: unknown) => Promise<unknown> | unknown;
  put?: (profile: unknown) => Promise<unknown> | unknown;
  write?: (profile: unknown) => Promise<unknown> | unknown;
  reset?: (profile?: unknown) => Promise<unknown> | unknown;
  resetSampleData?: (profile?: unknown) => Promise<unknown> | unknown;
  resetToSampleData?: (profile?: unknown) => Promise<unknown> | unknown;
  seedSampleProfile?: (profile?: unknown) => Promise<unknown> | unknown;
};

type ProfileRepositoryModule = {
  createProfileRepository?: () => Promise<ProfileRepository> | ProfileRepository;
};

const profileRepositoryModules = import.meta.glob("../storage/profileRepository.ts");
const profileRepositoryModuleKey = "../storage/profileRepository.ts";

let repositoryPromise: Promise<ProfileRepository> | null = null;

const unwrapProfile = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  return record.profile ?? record.resumeProfile ?? record.data ?? value;
};

const getProfileRepository = async () => {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const loadModule = profileRepositoryModules[profileRepositoryModuleKey];

      if (!loadModule) {
        throw new Error(
          "Profile repository is not available yet at src/storage/profileRepository.ts.",
        );
      }

      const module = (await loadModule()) as ProfileRepositoryModule;

      if (typeof module.createProfileRepository !== "function") {
        throw new Error(
          "src/storage/profileRepository.ts must export createProfileRepository().",
        );
      }

      return module.createProfileRepository();
    })();
  }

  return repositoryPromise;
};

const findMethod = <Args extends unknown[]>(
  repository: ProfileRepository,
  names: Array<keyof ProfileRepository>,
) => {
  for (const name of names) {
    const method = repository[name];

    if (typeof method === "function") {
      return method as (...args: Args) => Promise<unknown> | unknown;
    }
  }

  return null;
};

export const loadProfileFromRepository = async () => {
  const repository = await getProfileRepository();
  const loadProfile = findMethod(repository, [
    "loadProfile",
    "getProfile",
    "getOrCreateProfile",
    "load",
    "get",
    "read",
    "current",
  ]);

  if (!loadProfile) {
    throw new Error(
      "Profile repository must expose loadProfile(), getProfile(), getOrCreateProfile(), or load().",
    );
  }

  const result = await loadProfile();
  const profile = unwrapProfile(result);

  if (profile == null) {
    return null;
  }

  return normalizeProfile(profile);
};

export const saveProfileToRepository = async (profile: ResumeProfile) => {
  const repository = await getProfileRepository();
  const saveProfile = findMethod<[unknown]>(repository, [
    "saveProfile",
    "upsertProfile",
    "updateProfile",
    "save",
    "put",
    "write",
  ]);

  if (!saveProfile) {
    throw new Error(
      "Profile repository must expose saveProfile(), upsertProfile(), updateProfile(), or save().",
    );
  }

  const profileToSave: ResumeProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  const repositoryProfile = toRepositoryProfile(profileToSave);
  const result = await saveProfile(repositoryProfile);
  const savedProfile = unwrapProfile(result);

  return savedProfile == null
    ? normalizeProfile(repositoryProfile)
    : normalizeProfile(savedProfile);
};

export const resetProfileSampleData = async () => {
  const sampleProfile = createSampleProfile();
  const repository = await getProfileRepository();
  const resetProfile = findMethod<[unknown]>(repository, [
    "reset",
    "resetSampleData",
    "resetToSampleData",
    "seedSampleProfile",
  ]);

  if (resetProfile) {
    const result = await resetProfile(toRepositoryProfile(sampleProfile));
    const profile = unwrapProfile(result);

    if (profile != null) {
      return normalizeProfile(profile);
    }
  }

  return saveProfileToRepository(sampleProfile);
};
