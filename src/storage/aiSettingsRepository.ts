import {
  createDefaultAiProviderConfigs,
  type AiProviderConfig,
} from "../domain/aiTailoring";
import { getDefaultJsonStorage, type JsonStorage } from "./jsonStorage";

export const AI_PROVIDER_CONFIG_STORAGE_KEY = "resumelab.ai.providers.v1";

export interface AiSettingsRepository {
  loadProviderConfigs(): Promise<AiProviderConfig[]>;
  saveProviderConfigs(configs: AiProviderConfig[]): Promise<void>;
  upsertProviderConfig(config: AiProviderConfig): Promise<AiProviderConfig[]>;
}

export function createAiSettingsRepository(
  storage: JsonStorage = getDefaultJsonStorage(),
): AiSettingsRepository {
  async function loadProviderConfigs() {
    const stored = await storage.getItem(AI_PROVIDER_CONFIG_STORAGE_KEY);

    if (stored === null) {
      const defaults = createDefaultAiProviderConfigs();
      await saveProviderConfigs(defaults);
      return cloneConfigs(defaults);
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed) || !parsed.every(isAiProviderConfig)) {
      throw new Error("Stored AI provider settings are invalid.");
    }

    const merged = mergeWithDefaults(parsed);

    if (merged.length !== parsed.length) {
      await saveProviderConfigs(merged);
    }

    return cloneConfigs(merged);
  }

  async function saveProviderConfigs(configs: AiProviderConfig[]) {
    await storage.setItem(
      AI_PROVIDER_CONFIG_STORAGE_KEY,
      JSON.stringify(configs, null, 2),
    );
  }

  async function upsertProviderConfig(config: AiProviderConfig) {
    const configs = await loadProviderConfigs();
    const timestamp = new Date().toISOString();
    const nextConfig = {
      ...config,
      updatedAt: timestamp,
    };
    const nextConfigs = configs.some((item) => item.id === config.id)
      ? configs.map((item) => (item.id === config.id ? nextConfig : item))
      : [nextConfig, ...configs];

    await saveProviderConfigs(nextConfigs);
    return cloneConfigs(nextConfigs);
  }

  return {
    loadProviderConfigs,
    saveProviderConfigs,
    upsertProviderConfig,
  };
}

function mergeWithDefaults(configs: AiProviderConfig[]) {
  const defaults = createDefaultAiProviderConfigs();
  const configIds = new Set(configs.map((config) => config.id));

  return [
    ...configs,
    ...defaults.filter((config) => !configIds.has(config.id)),
  ];
}

function cloneConfigs(configs: AiProviderConfig[]) {
  return JSON.parse(JSON.stringify(configs)) as AiProviderConfig[];
}

function isAiProviderConfig(value: unknown): value is AiProviderConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    isProvider(record.provider) &&
    typeof record.label === "string" &&
    typeof record.model === "string" &&
    typeof record.baseUrl === "string" &&
    typeof record.enabled === "boolean" &&
    typeof record.hasSecret === "boolean"
  );
}

function isProvider(value: unknown) {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "google" ||
    value === "openrouter"
  );
}
