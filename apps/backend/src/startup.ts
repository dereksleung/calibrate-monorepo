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

function parseLiteralConfiguration(
  source: string,
  privateKey: string,
): Record<string, string> {
  const literalLine =
    /^\s*(?:#[^\r\n]*|[A-Za-z_][A-Za-z0-9_]*='[^'\r\n]*')?\s*$/;

  if (!source.split(/\r?\n/).every((line) => literalLine.test(line))) {
    throw new Error(
      "Production configuration must use single-quoted literals",
    );
  }

  // The runtime exports logger, but v1.54.1 omits it from its declarations.
  const logger = (
    dotenvx as typeof dotenvx & {
      logger: { error: (message: unknown) => void };
    }
  ).logger;

  let failed = false;
  let parsed: Record<string, string>;
  const originalError = logger.error;

  try {
    // parse is synchronous; restore the logger immediately afterward.
    logger.error = () => {
      failed = true;
    };

    parsed = dotenvx.parse(source, {
      privateKey,
      processEnv: {},
    });
  } finally {
    logger.error = originalError;
  }

  if (failed) {
    throw new Error("Production configuration could not be decrypted");
  }

  return parsed;
}

async function start(): Promise<void> {
  const privateKey = await fetchDotenvPrivateKey();

  const source = await readFile(
    "/run/config/.env.production",
    "utf8",
  );

  const parsed = parseLiteralConfiguration(source, privateKey);
  const configuration = validateRuntimeConfiguration(parsed);

  initializeRuntimeEnvironment(configuration);

  // Load application modules only after configuration is ready.
  await import("./app.js");
}

start().catch(() => {
  // Do not print the raw exception, configuration, or subprocess output.
  console.error("Backend startup failed");
  process.exitCode = 1;
});