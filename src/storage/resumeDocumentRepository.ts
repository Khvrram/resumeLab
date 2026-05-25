import {
  isResumeDocumentArray,
  type ResumeDocument,
} from "../domain/resumeDocuments";
import { getDefaultJsonStorage, type JsonStorage } from "./jsonStorage";

export const RESUME_DOCUMENTS_STORAGE_KEY = "resumelab.resume.documents.v1";

export interface ResumeDocumentRepository {
  load(): Promise<ResumeDocument[]>;
  save(documents: ResumeDocument[]): Promise<void>;
  upsert(document: ResumeDocument): Promise<ResumeDocument[]>;
  remove(documentId: string): Promise<ResumeDocument[]>;
  reset(): Promise<ResumeDocument[]>;
  exportJson(): Promise<string>;
}

export function createResumeDocumentRepository(
  storage: JsonStorage = getDefaultJsonStorage(),
): ResumeDocumentRepository {
  async function load(): Promise<ResumeDocument[]> {
    const storedDocuments = await storage.getItem(RESUME_DOCUMENTS_STORAGE_KEY);

    if (storedDocuments === null) {
      await storage.setItem(RESUME_DOCUMENTS_STORAGE_KEY, serializeDocuments([]));
      return [];
    }

    return deserializeDocuments(storedDocuments);
  }

  async function save(documents: ResumeDocument[]): Promise<void> {
    await storage.setItem(
      RESUME_DOCUMENTS_STORAGE_KEY,
      serializeDocuments(documents),
    );
  }

  async function upsert(document: ResumeDocument): Promise<ResumeDocument[]> {
    const documents = await load();
    const exists = documents.some((item) => item.id === document.id);
    const nextDocuments = exists
      ? documents.map((item) => (item.id === document.id ? document : item))
      : [document, ...documents];

    await save(nextDocuments);
    return cloneDocuments(nextDocuments);
  }

  async function remove(documentId: string): Promise<ResumeDocument[]> {
    const documents = await load();
    const nextDocuments = documents.filter((item) => item.id !== documentId);

    await save(nextDocuments);
    return cloneDocuments(nextDocuments);
  }

  async function reset(): Promise<ResumeDocument[]> {
    await storage.removeItem(RESUME_DOCUMENTS_STORAGE_KEY);
    return load();
  }

  async function exportJson(): Promise<string> {
    const documents = await load();
    return serializeDocuments(documents);
  }

  return {
    exportJson,
    load,
    remove,
    reset,
    save,
    upsert,
  };
}

function serializeDocuments(documents: ResumeDocument[]): string {
  return JSON.stringify(documents, null, 2);
}

function deserializeDocuments(serializedDocuments: string): ResumeDocument[] {
  const parsedDocuments = parseJson(serializedDocuments);

  if (!isResumeDocumentArray(parsedDocuments)) {
    throw new Error(
      "Stored resume documents do not match ResumeDocument schema v1.",
    );
  }

  return parsedDocuments;
}

function cloneDocuments(documents: ResumeDocument[]): ResumeDocument[] {
  return deserializeDocuments(serializeDocuments(documents));
}

function parseJson(serializedDocuments: string): unknown {
  try {
    const parsed: unknown = JSON.parse(serializedDocuments);
    return parsed;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new Error(`Stored resume documents JSON is invalid: ${message}`);
  }
}
