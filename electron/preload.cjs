const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("resumelab", {
  getRuntime: () => ipcRenderer.invoke("app:get-runtime"),
  storage: {
    exportAll: () => ipcRenderer.invoke("storage:export-all"),
    getItem: (key) => ipcRenderer.invoke("storage:get", key),
    removeItem: (key) => ipcRenderer.invoke("storage:remove", key),
    setItem: (key, value) => ipcRenderer.invoke("storage:set", key, value),
  },
});
