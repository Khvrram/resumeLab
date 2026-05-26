/// <reference types="vite/client" />

interface Window {
  resumelab?: {
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
    backup?: {
      exportBackup: () => Promise<{
        canceled: boolean;
        filePath: string | null;
      }>;
      importBackup: () => Promise<{
        canceled: boolean;
        imported: number;
      }>;
    };
    files?: {
      saveResumeArtifact: (request: {
        contentBase64?: string;
        defaultFileName: string;
        kind: "pdf" | "docx" | "txt" | "tex";
        textContent?: string;
      }) => Promise<{
        canceled: boolean;
        filePath: string | null;
      }>;
    };
    getRuntime: () => Promise<{
      isPackaged: boolean;
      platform: string;
      secretStorageAvailable?: boolean;
      storageMode: string;
      version: string;
    }>;
    secrets?: {
      deleteProviderKey: (providerId: string) => Promise<void>;
      hasProviderKey: (providerId: string) => Promise<boolean>;
      setProviderKey: (providerId: string, secret: string) => Promise<void>;
    };
    storage?: {
      exportAll: () => Promise<Array<{ key: string; value: string; updated_at: string }>>;
      getItem: (key: string) => Promise<string | null>;
      removeItem: (key: string) => Promise<void>;
      setItem: (key: string, value: string) => Promise<void>;
    };
  };
}
