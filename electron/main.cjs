const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell,
} = require("electron");
const fs = require("node:fs/promises");
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
    backgroundColor: "#fafafa",
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
