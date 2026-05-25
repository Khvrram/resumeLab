const fs = require("node:fs");
const path = require("node:path");
const { safeStorage } = require("electron");

const providerKeyPattern = /^provider_(openai|anthropic|google|openrouter)$/;

function createSecretStore(filePath) {
  let cache = null;

  function load() {
    if (cache) {
      return cache;
    }

    try {
      cache = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      cache = {};
    }

    if (!cache || typeof cache !== "object" || Array.isArray(cache)) {
      cache = {};
    }

    return cache;
  }

  function save(records) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
  }

  function ensureEncryptionAvailable() {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("OS-backed secret encryption is not available.");
    }
  }

  return {
    deleteProviderKey(providerId) {
      const key = validateProviderSecretId(providerId);
      const records = load();
      delete records[key];
      save(records);
    },
    getProviderKey(providerId) {
      const key = validateProviderSecretId(providerId);
      const encrypted = load()[key];

      if (typeof encrypted !== "string" || encrypted.length === 0) {
        return null;
      }

      ensureEncryptionAvailable();
      return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    },
    hasProviderKey(providerId) {
      const key = validateProviderSecretId(providerId);
      const encrypted = load()[key];
      return typeof encrypted === "string" && encrypted.length > 0;
    },
    setProviderKey(providerId, secret) {
      const key = validateProviderSecretId(providerId);
      const normalizedSecret = validateSecret(secret);

      ensureEncryptionAvailable();
      const records = load();
      records[key] = safeStorage
        .encryptString(normalizedSecret)
        .toString("base64");
      save(records);
    },
  };
}

function validateProviderSecretId(value) {
  if (typeof value !== "string" || !providerKeyPattern.test(value)) {
    throw new Error("Invalid provider secret id.");
  }

  return value;
}

function validateSecret(value) {
  if (typeof value !== "string" || value.trim().length < 8) {
    throw new Error("Provider key is too short.");
  }

  return value.trim();
}

module.exports = {
  createSecretStore,
  validateProviderSecretId,
};
