export interface JsonStorage {
  getItem(key: string): Promise<string | null> | string | null;
  removeItem(key: string): Promise<void> | void;
  setItem(key: string, value: string): Promise<void> | void;
}

export function getDefaultJsonStorage(): JsonStorage {
  const desktopStorage = globalThis.window?.resumelab?.storage;

  if (desktopStorage) {
    return typeof globalThis.localStorage === "undefined"
      ? desktopStorage
      : createMigratingJsonStorage(desktopStorage, globalThis.localStorage);
  }

  if (typeof globalThis.localStorage !== "undefined") {
    return globalThis.localStorage;
  }

  throw new Error(
    "No Storage implementation was provided and local storage is unavailable.",
  );
}

export function createMigratingJsonStorage(
  primaryStorage: JsonStorage,
  fallbackStorage: JsonStorage,
): JsonStorage {
  return {
    async getItem(key) {
      const primaryValue = await primaryStorage.getItem(key);

      if (primaryValue !== null) {
        return primaryValue;
      }

      const fallbackValue = await fallbackStorage.getItem(key);

      if (fallbackValue !== null) {
        await primaryStorage.setItem(key, fallbackValue);
      }

      return fallbackValue;
    },
    async removeItem(key) {
      await primaryStorage.removeItem(key);
      await fallbackStorage.removeItem(key);
    },
    async setItem(key, value) {
      await primaryStorage.setItem(key, value);
      await fallbackStorage.removeItem(key);
    },
  };
}
