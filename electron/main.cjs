const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const { createDesktopJsonStore, validateKey } = require("./storage.cjs");

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
let jsonStore = null;

function getJsonStore() {
  if (!jsonStore) {
    jsonStore = createDesktopJsonStore(
      path.join(app.getPath("userData"), "resumelab.sqlite3"),
    );
  }

  return jsonStore;
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
