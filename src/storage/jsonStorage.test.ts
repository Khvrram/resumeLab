import { describe, expect, it } from "vitest";
import { createMigratingJsonStorage, type JsonStorage } from "./jsonStorage";

describe("createMigratingJsonStorage", () => {
  it("copies fallback values into primary storage on first read", async () => {
    const primary = new MemoryJsonStorage();
    const fallback = new MemoryJsonStorage();
    const storage = createMigratingJsonStorage(primary, fallback);

    await fallback.setItem("resumelab.profile.v1", "{\"profile\":true}");

    expect(await storage.getItem("resumelab.profile.v1")).toBe(
      "{\"profile\":true}",
    );
    expect(await primary.getItem("resumelab.profile.v1")).toBe(
      "{\"profile\":true}",
    );
  });

  it("prefers primary storage once migrated", async () => {
    const primary = new MemoryJsonStorage();
    const fallback = new MemoryJsonStorage();
    const storage = createMigratingJsonStorage(primary, fallback);

    await primary.setItem("resumelab.workspace.v2", "{\"primary\":true}");
    await fallback.setItem("resumelab.workspace.v2", "{\"fallback\":true}");

    expect(await storage.getItem("resumelab.workspace.v2")).toBe(
      "{\"primary\":true}",
    );
  });

  it("writes new values to primary storage and clears fallback storage", async () => {
    const primary = new MemoryJsonStorage();
    const fallback = new MemoryJsonStorage();
    const storage = createMigratingJsonStorage(primary, fallback);

    await fallback.setItem("resumelab.resume.documents.v1", "old");
    await storage.setItem("resumelab.resume.documents.v1", "new");

    expect(await primary.getItem("resumelab.resume.documents.v1")).toBe("new");
    expect(await fallback.getItem("resumelab.resume.documents.v1")).toBeNull();
  });

  it("removes values from both stores", async () => {
    const primary = new MemoryJsonStorage();
    const fallback = new MemoryJsonStorage();
    const storage = createMigratingJsonStorage(primary, fallback);

    await primary.setItem("resumelab.profile.v1", "primary");
    await fallback.setItem("resumelab.profile.v1", "fallback");
    await storage.removeItem("resumelab.profile.v1");

    expect(await primary.getItem("resumelab.profile.v1")).toBeNull();
    expect(await fallback.getItem("resumelab.profile.v1")).toBeNull();
  });
});

class MemoryJsonStorage implements JsonStorage {
  private readonly entries = new Map<string, string>();

  async getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  async removeItem(key: string) {
    this.entries.delete(key);
  }

  async setItem(key: string, value: string) {
    this.entries.set(key, value);
  }
}
