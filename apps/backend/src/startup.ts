import dotenvx from "@dotenvx/dotenvx";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import {
  initializeRuntimeEnvironment,
  validateRuntimeConfiguration,
} from "./infrastructure/runtime-environment.js";

const execFileAsync = promisify(execFile);

async function fetchDotenvPrivateKey(): Promise<string> {
  const token = (await readFile("/run/secrets/doppler_token", "utf8")).trim();

  if (!token) {
    throw new Error("Doppler token file is empty");
  }

  try {
    const { stdout } = await execFileAsync(
      "/usr/local/bin/doppler",
      ["--config-dir", "/tmp/doppler", "secrets", "get", "DOTENV_PRIVATE_KEY_PRODUCTION", "--plain"],
      {
        encoding: "utf8",
        env: { DOPPLER_TOKEN: token },
        timeout: 30_000,
        maxBuffer: 16 * 1024,
      },
    );

    const privateKey = stdout.trim();

    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error("Invalid dotenvx private key");
    }

    return privateKey;
  } catch {
    // Avoid logging subprocess errors containing captured secret output.
    throw new Error("Unable to retrieve the dotenvx private key");
  }
}

const privateKey = await fetchDotenvPrivateKey();

const parsed = dotenvx.parse(await readFile("/run/config/.env.production", "utf8"), {
  privateKey,
  processEnv: {},
});

const configuration = validateRuntimeConfiguration(parsed);

initializeRuntimeEnvironment(configuration);

// Deliberately dynamic: application modules load after initialization.
await import("./app.js");
