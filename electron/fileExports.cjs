const path = require("node:path");

const artifactDefinitions = {
  docx: {
    extensions: ["docx"],
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    name: "Word Document",
  },
  pdf: {
    extensions: ["pdf"],
    mimeType: "application/pdf",
    name: "PDF",
  },
  tex: {
    extensions: ["tex"],
    mimeType: "application/x-tex",
    name: "LaTeX Source",
  },
  txt: {
    extensions: ["txt"],
    mimeType: "text/plain",
    name: "Plain Text",
  },
};

function validateArtifactKind(kind) {
  if (!Object.hasOwn(artifactDefinitions, kind)) {
    throw new Error("Unsupported export artifact type.");
  }

  return kind;
}

function normalizeDefaultFileName(defaultFileName, kind) {
  const definition = artifactDefinitions[kind];
  const fallbackName = `resume.${definition.extensions[0]}`;
  const rawFileName =
    typeof defaultFileName === "string" && defaultFileName.trim()
      ? defaultFileName.trim()
      : fallbackName;
  const fileName = path.basename(path.win32.basename(rawFileName));
  const lowerFileName = fileName.toLowerCase();

  return definition.extensions.some((extension) =>
    lowerFileName.endsWith(`.${extension}`),
  )
    ? fileName
    : `${fileName}.${definition.extensions[0]}`;
}

function createArtifactBuffer(request) {
  if (typeof request.textContent === "string") {
    return Buffer.from(request.textContent, "utf8");
  }

  if (
    typeof request.contentBase64 === "string" &&
    request.contentBase64.length > 0
  ) {
    return Buffer.from(request.contentBase64, "base64");
  }

  throw new Error("Export artifact is empty.");
}

function createSaveDialogOptions(request) {
  if (!request || typeof request !== "object") {
    throw new Error("Export request is invalid.");
  }

  const kind = validateArtifactKind(request.kind);
  const definition = artifactDefinitions[kind];

  return {
    defaultPath: normalizeDefaultFileName(request.defaultFileName, kind),
    filters: [
      {
        extensions: definition.extensions,
        name: definition.name,
      },
    ],
    properties: ["createDirectory", "showOverwriteConfirmation"],
    title: `Export ${definition.name}`,
  };
}

async function saveResumeArtifact(request, dependencies) {
  const buffer = createArtifactBuffer(request);
  const options = createSaveDialogOptions(request);
  const result = await dependencies.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return {
      canceled: true,
      filePath: null,
    };
  }

  await dependencies.writeFile(result.filePath, buffer);

  return {
    canceled: false,
    filePath: result.filePath,
  };
}

module.exports = {
  artifactDefinitions,
  createSaveDialogOptions,
  saveResumeArtifact,
};
