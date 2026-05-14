const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

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
  storageMode: "renderer-localStorage-phase1",
  version: app.getVersion(),
}));

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
