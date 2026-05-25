import { describe, expect, it } from "vitest";
import { createDefaultAiProviderConfigs } from "../domain/aiTailoring";
import { createAiSettingsRepository } from "./aiSettingsRepository";
import type { JsonStorage } from "./jsonStorage";

describe("aiSettingsRepository", () => {
  it("seeds provider metadata without secrets", async () => {
    const repository = createAiSettingsRepository(createMemoryStorage());

    const configs = await repository.loadProviderConfigs();

    expect(configs).toHaveLength(4);
    expect(configs.map((config) => config.provider)).toEqual([
      "openai",
      "anthropic",
      "google",
      "openrouter",
    ]);
    expect(configs.every((config) => config.hasSecret === false)).toBe(true);
  });

  it("updates provider metadata without mutating caller state", async () => {
    const repository = createAiSettingsRepository(createMemoryStorage());
    const [openai] = await repository.loadProviderConfigs();
    const next = await repository.upsertProviderConfig({
      ...openai,
      hasSecret: true,
      model: "gpt-custom",
    });

    expect(next.find((config) => config.id === openai.id)?.model).toBe(
      "gpt-custom",
    );
    openai.model = "mutated";
    expect((await repository.loadProviderConfigs())[0].model).toBe("gpt-custom");
  });

  it("backfills missing default providers", async () => {
    const storage = createMemoryStorage();
    const [openai] = createDefaultAiProviderConfigs(
      "2026-05-26T00:00:00.000Z",
    );
    await storage.setItem(
      "resumelab.ai.providers.v1",
      JSON.stringify([openai], null, 2),
    );

    const configs = await createAiSettingsRepository(storage).loadProviderConfigs();

    expect(configs.map((config) => config.provider)).toEqual([
      "openai",
      "anthropic",
      "google",
      "openrouter",
    ]);
  });
});

function createMemoryStorage(): JsonStorage {
  const records = new Map<string, string>();

  return {
    async getItem(key) {
      return records.get(key) ?? null;
    },
    async removeItem(key) {
      records.delete(key);
    },
    async setItem(key, value) {
      records.set(key, value);
    },
  };
}
