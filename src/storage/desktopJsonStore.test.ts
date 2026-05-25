/// <reference types="node" />

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createDesktopJsonStore, validateKey } = require("../../electron/storage.cjs") as {
  createDesktopJsonStore: (databasePath: string) => DesktopJsonStore;
  validateKey: (key: string) => string;
};

type DesktopJsonStore = {
  close: () => void;
  exportAll: () => Array<{ key: string; value: string; updated_at: string }>;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

let temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.forEach((directory) =>
    rmSync(directory, { force: true, recursive: true }),
  );
  temporaryDirectories = [];
});

describe("desktopJsonStore", () => {
  it("persists JSON strings in SQLite across store instances", () => {
    const databasePath = createDatabasePath();
    const firstStore = createDesktopJsonStore(databasePath);

    firstStore.setItem("resumelab.profile.v1", "{\"name\":\"Maya\"}");
    firstStore.close();

    const secondStore = createDesktopJsonStore(databasePath);

    expect(secondStore.getItem("resumelab.profile.v1")).toBe(
      "{\"name\":\"Maya\"}",
    );
    secondStore.close();
  });

  it("removes stored keys", () => {
    const store = createDesktopJsonStore(createDatabasePath());

    store.setItem("resumelab.workspace.v2", "{}");
    store.removeItem("resumelab.workspace.v2");

    expect(store.getItem("resumelab.workspace.v2")).toBeNull();
    store.close();
  });

  it("exports stored rows with timestamps", () => {
    const store = createDesktopJsonStore(createDatabasePath());

    store.setItem("resumelab.resume.documents.v1", "[]");

    expect(store.exportAll()).toEqual([
      expect.objectContaining({
        key: "resumelab.resume.documents.v1",
        value: "[]",
      }),
    ]);
    expect(store.exportAll()[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    store.close();
  });

  it("rejects invalid keys", () => {
    expect(() => validateKey("../profile")).toThrow(/Invalid storage key/);
    expect(() => validateKey("")).toThrow(/Invalid storage key/);
  });
});

function createDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), "resumelab-store-"));
  temporaryDirectories.push(directory);
  return join(directory, "resumelab.sqlite3");
}
