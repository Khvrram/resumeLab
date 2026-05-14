import { describe, expect, it } from "vitest";
import {
  createEmptyProfile,
  createSampleProfile,
  type ResumeProfile,
} from "../domain/profile";
import {
  createProfileRepository,
  PROFILE_STORAGE_KEY,
} from "./profileRepository";

describe("profileRepository", () => {
  it("seeds the sample profile when nothing is stored", async () => {
    const storage = new MemoryStorage();
    const repository = createProfileRepository(storage);

    const profile = await repository.load();

    expect(profile).toEqual(createSampleProfile());
    expect(readStoredProfile(storage)).toEqual(createSampleProfile());
  });

  it("loads an existing stored profile without reseeding", async () => {
    const storage = new MemoryStorage();
    const repository = createProfileRepository(storage);
    const savedProfile = createCustomProfile();

    await repository.save(savedProfile);

    expect(await repository.load()).toEqual(savedProfile);
    expect(readStoredProfile(storage)).toEqual(savedProfile);
  });

  it("persists saved profile changes", async () => {
    const storage = new MemoryStorage();
    const repository = createProfileRepository(storage);
    const profile = createSampleProfile();
    const updatedProfile: ResumeProfile = {
      ...profile,
      updatedAt: "2026-05-14T15:30:00.000Z",
      basics: {
        ...profile.basics,
        fullName: "Jordan Lee",
        headline: "Privacy-focused frontend engineer",
      },
    };

    await repository.save(updatedProfile);

    expect(await repository.load()).toEqual(updatedProfile);
  });

  it("resets storage back to the seeded sample profile", async () => {
    const storage = new MemoryStorage();
    const repository = createProfileRepository(storage);

    await repository.save(createCustomProfile());

    const resetProfile = await repository.reset();

    expect(resetProfile).toEqual(createSampleProfile());
    expect(readStoredProfile(storage)).toEqual(createSampleProfile());
  });

  it("exports the current profile as formatted JSON", async () => {
    const storage = new MemoryStorage();
    const repository = createProfileRepository(storage);
    const savedProfile = createCustomProfile();

    await repository.save(savedProfile);

    const exportedJson = await repository.exportJson();
    const exportedProfile: unknown = JSON.parse(exportedJson);

    expect(exportedProfile).toEqual(savedProfile);
    expect(exportedJson).toBe(JSON.stringify(savedProfile, null, 2));
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

function createCustomProfile(): ResumeProfile {
  const profile = createEmptyProfile("2026-05-14T12:00:00.000Z");
  profile.id = "profile_custom";
  profile.basics.id = "basics_custom";
  profile.basics.fullName = "Jordan Lee";
  profile.basics.headline = "Local-first resume systems engineer";
  profile.basics.email = "jordan.lee@example.com";

  return profile;
}

function readStoredProfile(storage: Storage): unknown {
  const storedProfile = storage.getItem(PROFILE_STORAGE_KEY);

  if (storedProfile === null) {
    return null;
  }

  const parsedProfile: unknown = JSON.parse(storedProfile);
  return parsedProfile;
}
