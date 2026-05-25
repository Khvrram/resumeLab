import {
  renderKhurramsResumeLatex,
  renderKhurramsResumeText,
} from "./khurramsResumeTemplate";
import type { ResumeDraft } from "./resumeDraft";
import type { ResumeProfile } from "../components/profileTypes";

export const RESUME_DOCUMENT_SCHEMA_VERSION = 1 as const;

export type ResumeDocumentMode = "text" | "latex";

export type ResumeDocumentRevision = {
  id: string;
  createdAt: string;
  label: string;
  mode: ResumeDocumentMode;
  textContent: string;
  latexContent: string;
};

export type ResumeDocument = {
  schemaVersion: typeof RESUME_DOCUMENT_SCHEMA_VERSION;
  id: string;
  title: string;
  jobApplicationId: string | null;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  sourceProfileUpdatedAt: string;
  sourceDraftGeneratedAt: string;
  mode: ResumeDocumentMode;
  textContent: string;
  latexContent: string;
  revisions: ResumeDocumentRevision[];
};

export type ResumeDocumentContentPatch = {
  mode?: ResumeDocumentMode;
  textContent?: string;
  latexContent?: string;
};

export function createResumeDocument({
  draft,
  jobApplicationId,
  profile,
  templateId = "khurramsresume",
  title,
}: {
  draft: ResumeDraft;
  jobApplicationId: string | null;
  profile: ResumeProfile;
  templateId?: string;
  title?: string;
}): ResumeDocument {
  const timestamp = new Date().toISOString();
  const document: ResumeDocument = {
    schemaVersion: RESUME_DOCUMENT_SCHEMA_VERSION,
    id: createId("resume_doc"),
    title:
      title?.trim() ||
      [draft.profileName || profile.basics.fullName || "Resume", "draft"]
        .filter(Boolean)
        .join(" "),
    jobApplicationId,
    templateId,
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceProfileUpdatedAt: profile.updatedAt,
    sourceDraftGeneratedAt: draft.generatedAt,
    mode: "text",
    textContent: renderKhurramsResumeText(draft),
    latexContent: renderKhurramsResumeLatex(draft),
    revisions: [],
  };

  return createResumeRevision(document, "Initial generated draft");
}

export function updateResumeDocumentContent(
  document: ResumeDocument,
  patch: ResumeDocumentContentPatch,
): ResumeDocument {
  return {
    ...document,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export function refreshResumeDocumentFromDraft(
  document: ResumeDocument,
  draft: ResumeDraft,
  profile: ResumeProfile,
): ResumeDocument {
  const withCheckpoint = createResumeRevision(document, "Before profile refresh");

  return {
    ...withCheckpoint,
    updatedAt: new Date().toISOString(),
    sourceProfileUpdatedAt: profile.updatedAt,
    sourceDraftGeneratedAt: draft.generatedAt,
    textContent: renderKhurramsResumeText(draft),
    latexContent: renderKhurramsResumeLatex(draft),
  };
}

export function createResumeRevision(
  document: ResumeDocument,
  label = "Manual checkpoint",
): ResumeDocument {
  const currentRevision = document.revisions[0];

  if (
    currentRevision &&
    currentRevision.textContent === document.textContent &&
    currentRevision.latexContent === document.latexContent &&
    currentRevision.mode === document.mode &&
    currentRevision.label === label
  ) {
    return document;
  }

  const timestamp = new Date().toISOString();
  const revision: ResumeDocumentRevision = {
    id: createId("resume_rev"),
    createdAt: timestamp,
    label,
    mode: document.mode,
    textContent: document.textContent,
    latexContent: document.latexContent,
  };

  return {
    ...document,
    updatedAt: timestamp,
    revisions: [revision, ...document.revisions].slice(0, 30),
  };
}

export function restoreResumeRevision(
  document: ResumeDocument,
  revisionId: string,
): ResumeDocument {
  const revision = document.revisions.find((item) => item.id === revisionId);

  if (!revision) {
    return document;
  }

  const withCheckpoint = createResumeRevision(document, "Before restore");

  return {
    ...withCheckpoint,
    updatedAt: new Date().toISOString(),
    mode: revision.mode,
    textContent: revision.textContent,
    latexContent: revision.latexContent,
  };
}

export function findDocumentForJob(
  documents: ResumeDocument[],
  jobApplicationId: string | null,
): ResumeDocument | null {
  return (
    documents.find((document) => document.jobApplicationId === jobApplicationId) ??
    documents[0] ??
    null
  );
}

export function isResumeDocument(value: unknown): value is ResumeDocument {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === RESUME_DOCUMENT_SCHEMA_VERSION &&
    isString(value.id) &&
    isString(value.title) &&
    (isString(value.jobApplicationId) || value.jobApplicationId === null) &&
    isString(value.templateId) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isString(value.sourceProfileUpdatedAt) &&
    isString(value.sourceDraftGeneratedAt) &&
    isResumeDocumentMode(value.mode) &&
    isString(value.textContent) &&
    isString(value.latexContent) &&
    Array.isArray(value.revisions) &&
    value.revisions.every(isResumeDocumentRevision)
  );
}

export function isResumeDocumentArray(value: unknown): value is ResumeDocument[] {
  return Array.isArray(value) && value.every(isResumeDocument);
}

function isResumeDocumentRevision(
  value: unknown,
): value is ResumeDocumentRevision {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.createdAt) &&
    isString(value.label) &&
    isResumeDocumentMode(value.mode) &&
    isString(value.textContent) &&
    isString(value.latexContent)
  );
}

function isResumeDocumentMode(value: unknown): value is ResumeDocumentMode {
  return value === "text" || value === "latex";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
