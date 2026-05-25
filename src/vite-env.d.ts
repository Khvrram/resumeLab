/// <reference types="vite/client" />

interface Window {
  resumelab?: {
    getRuntime: () => Promise<{
      isPackaged: boolean;
      platform: string;
      secretStorageAvailable?: boolean;
      storageMode: string;
      version: string;
    }>;
    ai?: {
      generateTailoringProposal: (request: {
        baseUrl: string;
        model: string;
        provider: "openai" | "anthropic" | "google" | "openrouter";
        providerId: string;
        systemPrompt: string;
        userPrompt: string;
      }) => Promise<{
        outputText: string;
        providerRequestId?: string | null;
        usage?: {
          inputTokens?: number | null;
          outputTokens?: number | null;
          totalTokens?: number | null;
        } | null;
      }>;
    };
    secrets?: {
      deleteProviderKey: (providerId: string) => Promise<void>;
      hasProviderKey: (providerId: string) => Promise<boolean>;
      setProviderKey: (providerId: string, secret: string) => Promise<void>;
    };
    storage?: {
      getItem: (key: string) => Promise<string | null>;
      removeItem: (key: string) => Promise<void>;
      setItem: (key: string, value: string) => Promise<void>;
    };
  };
}
