import { describe, expect, it } from "vitest";
import {
  createResumeDocxBytes,
  createResumePdfBytes,
} from "./resumeExports";
import type { ResumePreviewDocument } from "./khurramsResumeTemplate";

describe("resume exports", () => {
  const document: ResumePreviewDocument = {
    contact: "New York, NY | alex@example.com | https://example.com/alex",
    name: "Alex Morgan",
    sections: [
      {
        blocks: [
          {
            bullets: [],
            heading:
              "Product-minded engineer focused on local workflows, privacy, and ATS-friendly documents.",
            meta: "",
          },
        ],
        title: "Summary",
      },
      {
        blocks: [
          {
            bullets: [],
            heading: "Frontend: React, TypeScript",
            meta: "",
          },
        ],
        title: "Skills",
      },
      {
        blocks: [
          {
            bullets: [
              "Led a React and TypeScript migration that reduced dashboard load time by 38%.",
              "Designed a SQLite-backed offline queue for field teams.",
            ],
            heading: "Senior Product Engineer | Northstar Analytics",
            meta: "2022-08 - Present",
          },
        ],
        title: "Experience",
      },
    ],
    subtitle: "Local-first product engineer",
  };

  it("creates a readable PDF document", () => {
    const bytes = createResumePdfBytes(document, [document.sections]);
    const text = new TextDecoder().decode(bytes);

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/BaseFont /Helvetica");
    expect(text).toContain("ALEX MORGAN");
    expect(text).toContain("Senior Product Engineer");
    expect(text).toContain("%%EOF");
  });

  it("creates a valid stored DOCX package with resume XML", () => {
    const bytes = createResumeDocxBytes(document, [document.sections]);
    const entries = readStoredZip(bytes);
    const documentXml = entries.get("word/document.xml");

    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(entries.has("[Content_Types].xml")).toBe(true);
    expect(entries.has("_rels/.rels")).toBe(true);
    expect(entries.has("word/styles.xml")).toBe(true);
    expect(documentXml).toContain("ALEX MORGAN");
    expect(documentXml).toContain("EXPERIENCE");
    expect(documentXml).toContain("Senior Product Engineer | Northstar Analytics");
    expect(documentXml).toContain("- Led a React and TypeScript migration");
  });
});

function readStoredZip(bytes: Uint8Array) {
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let offset = 0;

  while (offset + 30 < bytes.byteLength) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    const signature = view.getUint32(0, true);

    if (signature !== 0x04034b50) {
      break;
    }

    const compressedSize = view.getUint32(18, true);
    const fileNameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    const fileName = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));
    const contents = decoder.decode(bytes.slice(dataStart, dataEnd));

    entries.set(fileName, contents);
    offset = dataEnd;
  }

  return entries;
}
