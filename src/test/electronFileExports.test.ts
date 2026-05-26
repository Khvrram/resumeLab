import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
  createSaveDialogOptions,
  saveResumeArtifact,
} = require("../../electron/fileExports.cjs") as {
  createSaveDialogOptions: (request: unknown) => {
    defaultPath: string;
    filters: Array<{ extensions: string[]; name: string }>;
    title: string;
  };
  saveResumeArtifact: (
    request: unknown,
    dependencies: {
      showSaveDialog: (options: unknown) => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;
      writeFile: (filePath: string, contents: Buffer) => Promise<void>;
    },
  ) => Promise<{ canceled: boolean; filePath: string | null }>;
};

describe("electron resume artifact exports", () => {
  it("sanitizes default filenames and selects the right dialog filter", () => {
    expect(
      createSaveDialogOptions({
        defaultFileName: "../Khurram Resume",
        kind: "pdf",
        textContent: "resume",
      }),
    ).toMatchObject({
      defaultPath: "Khurram Resume.pdf",
      filters: [{ extensions: ["pdf"], name: "PDF" }],
      title: "Export PDF",
    });
  });

  it("writes decoded binary artifacts to the selected destination", async () => {
    const writeFile = vi.fn(
      async (_filePath: string, _contents: Buffer) => undefined,
    );
    const result = await saveResumeArtifact(
      {
        contentBase64: Buffer.from("pdf bytes").toString("base64"),
        defaultFileName: "resume.pdf",
        kind: "pdf",
      },
      {
        showSaveDialog: vi.fn(async () => ({
          canceled: false,
          filePath: "C:\\exports\\resume.pdf",
        })),
        writeFile,
      },
    );

    expect(result).toEqual({
      canceled: false,
      filePath: "C:\\exports\\resume.pdf",
    });
    expect(writeFile).toHaveBeenCalledWith(
      "C:\\exports\\resume.pdf",
      Buffer.from("pdf bytes"),
    );
  });

  it("does not write when the save dialog is canceled", async () => {
    const writeFile = vi.fn();
    const result = await saveResumeArtifact(
      {
        defaultFileName: "resume.tex",
        kind: "tex",
        textContent: "\\documentclass{article}",
      },
      {
        showSaveDialog: vi.fn(async () => ({ canceled: true })),
        writeFile,
      },
    );

    expect(result).toEqual({
      canceled: true,
      filePath: null,
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported artifact types", async () => {
    await expect(
      saveResumeArtifact(
        {
          defaultFileName: "resume.exe",
          kind: "exe",
          textContent: "bad",
        },
        {
          showSaveDialog: vi.fn(),
          writeFile: vi.fn(),
        },
      ),
    ).rejects.toThrow("Unsupported export artifact type.");
  });
});
