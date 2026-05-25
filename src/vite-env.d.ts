/// <reference types="vite/client" />

interface Window {
  resumelab?: {
    getRuntime: () => Promise<{
      isPackaged: boolean;
      platform: string;
      storageMode: string;
      version: string;
    }>;
    storage?: {
      getItem: (key: string) => Promise<string | null>;
      removeItem: (key: string) => Promise<void>;
      setItem: (key: string, value: string) => Promise<void>;
    };
  };
}
