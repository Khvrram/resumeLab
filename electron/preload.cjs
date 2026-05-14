const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("resumelab", {
  getRuntime: () => ipcRenderer.invoke("app:get-runtime"),
});
