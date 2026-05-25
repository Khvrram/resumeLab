import { describe, expect, it } from "vitest";
import { createSampleProfile } from "../components/profileTypes";
import { buildResumeDraft } from "../domain/resumeDraft";
import { createResumeDocument, type ResumeDocument } from "../domain/resumeDocuments";
import {
  createResumeDocumentRepository,
  RESUME_DOCUMENTS_STORAGE_KEY,
} from "./resumeDocumentRepository";

describe("resumeDocumentRepository", () => {
  it("seeds empty document storage when nothing is stored", async () => {
    const storage = new MemoryStorage();
    const repository = createResumeDocumentRepository(storage);

    const documents = await repository.load();

    expect(documents).toEqual([]);
    expect(readStoredDocuments(storage)).toEqual([]);
  });

  it("persists and loads resume documents", async () => {
    const storage = new MemoryStorage();
    const repository = createResumeDocumentRepository(storage);
    const document = createDocument("job-1");

    await repository.save([document]);

    expect(await repository.load()).toEqual([document]);
  });

  it("upserts documents by id", async () => {
    const storage = new MemoryStorage();
    const repository = createResumeDocumentRepository(storage);
    const document = createDocument("job-1");
    const updatedDocument: ResumeDocument = {
      ...document,
      title: "Updated",
      textContent: "Updated text",
    };

    await repository.upsert(document);
    const documents = await repository.upsert(updatedDocument);

    expect(documents).toEqual([updatedDocument]);
    expect(await repository.load()).toEqual([updatedDocument]);
  });

  it("removes documents by id", async () => {
    const storage = new MemoryStorage();
    const repository = createResumeDocumentRepository(storage);
    const first = createDocument("job-1");
    const second = createDocument("job-2");

    await repository.save([first, second]);

    expect(await repository.remove(first.id)).toEqual([second]);
    expect(await repository.load()).toEqual([second]);
  });

  it("exports formatted JSON", async () => {
    const storage = new MemoryStorage();
    const repository = createResumeDocumentRepository(storage);
    const document = createDocument("job-1");

    await repository.save([document]);

    expect(await repository.exportJson()).toBe(JSON.stringify([document], null, 2));
  });

  it("throws without clearing storage when JSON is invalid", async () => {
    const storage = new MemoryStorage();
    storage.setItem(RESUME_DOCUMENTS_STORAGE_KEY, "{ invalid json");
    const repository = createResumeDocumentRepository(storage);

    await expect(repository.load()).rejects.toThrow(
      /Stored resume documents JSON is invalid/,
    );
    expect(storage.getItem(RESUME_DOCUMENTS_STORAGE_KEY)).toBe("{ invalid json");
  });

  it("throws without clearing storage when schema is invalid", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      RESUME_DOCUMENTS_STORAGE_KEY,
      JSON.stringify([{ id: "bad-document" }]),
    );
    const repository = createResumeDocumentRepository(storage);

    await expect(repository.load()).rejects.toThrow(
      /Stored resume documents do not match ResumeDocument schema v1/,
    );
    expect(readStoredDocuments(storage)).toEqual([{ id: "bad-document" }]);
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

function createDocument(jobApplicationId: string): ResumeDocument {
  const profile = createSampleProfile();
  const draft = buildResumeDraft(profile);

  return createResumeDocument({
    draft,
    jobApplicationId,
    profile,
  });
}

function readStoredDocuments(storage: Storage): unknown {
  const storedDocuments = storage.getItem(RESUME_DOCUMENTS_STORAGE_KEY);

  if (storedDocuments === null) {
    return null;
  }

  const parsedDocuments: unknown = JSON.parse(storedDocuments);
  return parsedDocuments;
}
