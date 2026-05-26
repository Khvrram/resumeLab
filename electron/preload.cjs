const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("resumelab", {
  ai: {
    generateTailoringProposal: (request) =>
      ipcRenderer.invoke("ai:generate-tailoring-proposal", request),
  },
  backup: {
    exportBackup: () => ipcRenderer.invoke("backup:export"),
    importBackup: () => ipcRenderer.invoke("backup:import"),
  },
  getRuntime: () => ipcRenderer.invoke("app:get-runtime"),
  files: {
    saveResumeArtifact: (request) =>
      ipcRenderer.invoke("files:save-resume-artifact", request),
  },
  secrets: {
    deleteProviderKey: (providerId) =>
      ipcRenderer.invoke("secrets:delete-provider-key", providerId),
    hasProviderKey: (providerId) =>
      ipcRenderer.invoke("secrets:provider-key-status", providerId),
    setProviderKey: (providerId, secret) =>
      ipcRenderer.invoke("secrets:set-provider-key", providerId, secret),
  },
  storage: {
    exportAll: () => ipcRenderer.invoke("storage:export-all"),
    getItem: (key) => ipcRenderer.invoke("storage:get", key),
    removeItem: (key) => ipcRenderer.invoke("storage:remove", key),
    setItem: (key, value) => ipcRenderer.invoke("storage:set", key, value),
  },
});
