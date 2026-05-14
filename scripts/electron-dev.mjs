import electronPath from "electron";
import { spawn } from "node:child_process";

const devUrl = "http://127.0.0.1:5173";

async function canReachDevServer() {
  try {
    const response = await fetch(devUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForDevServer(timeoutMs = 20_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canReachDevServer()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Vite did not respond at ${devUrl} within ${timeoutMs}ms.`);
}

let viteProcess = null;

if (!(await canReachDevServer())) {
  viteProcess = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev", "--", "--port", "5173", "--strictPort"],
    {
      shell: false,
      stdio: "inherit",
    },
  );
}

await waitForDevServer();

const electronProcess = spawn(electronPath, ["."], {
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: devUrl,
  },
  stdio: "inherit",
});

electronProcess.on("exit", (code) => {
  if (viteProcess) {
    viteProcess.kill();
  }

  process.exit(code ?? 0);
});
