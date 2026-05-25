export interface JsonStorage {
  getItem(key: string): Promise<string | null> | string | null;
  removeItem(key: string): Promise<void> | void;
  setItem(key: string, value: string): Promise<void> | void;
}

export function getDefaultJsonStorage(): JsonStorage {
  const desktopStorage = globalThis.window?.resumelab?.storage;

  if (desktopStorage) {
    return desktopStorage;
  }

  if (typeof globalThis.localStorage !== "undefined") {
    return globalThis.localStorage;
  }

  throw new Error(
    "No Storage implementation was provided and local storage is unavailable.",
  );
}
