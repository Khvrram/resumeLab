const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell,
} = require("electron");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { generateTailoringProposal } = require("./aiProviders.cjs");
const { saveResumeArtifact } = require("./fileExports.cjs");
const { createSecretStore, validateProviderSecretId } = require("./secrets.cjs");
const { createDesktopJsonStore, validateKey } = require("./storage.cjs");

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
let jsonStore = null;
let secretStore = null;

function getJsonStore() {
  if (!jsonStore) {
    jsonStore = createDesktopJsonStore(
      path.join(app.getPath("userData"), "resumelab.sqlite3"),
    );
  }

  return jsonStore;
}

function getSecretStore() {
  if (!secretStore) {
    secretStore = createSecretStore(
      path.join(app.getPath("userData"), "secrets", "providers.json"),
    );
  }

  return secretStore;
}

function createMainWindow() {
  const window = new BrowserWindow({
    title: "ResumeLab",
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#fafaf9",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (VITE_DEV_SERVER_URL) {
    void window.loadURL(VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("app:get-runtime", () => ({
  isPackaged: app.isPackaged,
  platform: process.platform,
  secretStorageAvailable: safeStorage.isEncryptionAvailable(),
  storageMode: "electron-sqlite",
  version: app.getVersion(),
}));

ipcMain.handle("storage:get", (_event, key) => getJsonStore().getItem(key));

ipcMain.handle("storage:set", (_event, key, value) => {
  getJsonStore().setItem(validateKey(key), value);
});

ipcMain.handle("storage:remove", (_event, key) => {
  getJsonStore().removeItem(validateKey(key));
});

ipcMain.handle("storage:export-all", () => getJsonStore().exportAll());

ipcMain.handle("secrets:provider-key-status", (_event, providerId) =>
  getSecretStore().hasProviderKey(validateProviderSecretId(providerId)),
);

ipcMain.handle("secrets:set-provider-key", (_event, providerId, secret) => {
  getSecretStore().setProviderKey(validateProviderSecretId(providerId), secret);
});

ipcMain.handle("secrets:delete-provider-key", (_event, providerId) => {
  getSecretStore().deleteProviderKey(validateProviderSecretId(providerId));
});

ipcMain.handle("ai:generate-tailoring-proposal", async (_event, request) =>
  generateTailoringProposal(request, (providerId) =>
    getSecretStore().getProviderKey(providerId),
  ),
);

ipcMain.handle("files:save-resume-artifact", (_event, request) =>
  saveResumeArtifact(request, {
    showSaveDialog: (options) => dialog.showSaveDialog(options),
    writeFile: (filePath, buffer) => fs.writeFile(filePath, buffer),
  }),
);

// Backup: export all local data to a JSON file
ipcMain.handle("backup:export", async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: `resumelab-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ extensions: ["json"], name: "ResumeLab Backup" }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
    title: "Export ResumeLab Backup",
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: null };
  }

  const records = getJsonStore().exportAll();
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    application: "ResumeLab",
    records: Object.fromEntries(
      records.map((row) => [row.key, JSON.parse(row.value)]),
    ),
  };

  await fs.writeFile(
    result.filePath,
    JSON.stringify(backup, null, 2),
    "utf8",
  );

  return { canceled: false, filePath: result.filePath };
});

// Backup: import data from a JSON file
ipcMain.handle("backup:import", async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ extensions: ["json"], name: "ResumeLab Backup" }],
    properties: ["openFile"],
    title: "Import ResumeLab Backup",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, imported: 0 };
  }

  const filePath = result.filePaths[0];
  const raw = await fs.readFile(filePath, "utf8");
  let backup;

  try {
    backup = JSON.parse(raw);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!backup || typeof backup !== "object" || !backup.records) {
    throw new Error(
      "This file does not appear to be a ResumeLab backup. Expected a JSON object with a 'records' field.",
    );
  }

  const store = getJsonStore();
  let imported = 0;

  for (const [key, value] of Object.entries(backup.records)) {
    if (typeof key === "string" && /^[a-zA-Z0-9._:-]{1,160}$/.test(key)) {
      store.setItem(key, JSON.stringify(value));
      imported++;
    }
  }

  return { canceled: false, imported };
});

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  jsonStore?.close();
  jsonStore = null;
});
