import dotenvx from "@dotenvx/dotenvx";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import {
  initializeRuntimeEnvironment,
  RuntimeConfigurationError,
  validateRuntimeConfiguration,
} from "./infrastructure/runtime-environment.js";

const execFileAsync = promisify(execFile);
let startupStage = "read-doppler-token";

class StartupError extends Error {}

function safeFailureReason(error: unknown): string {
  if (error instanceof StartupError || error instanceof RuntimeConfigurationError) {
    return error.message;
  }

  if (error !== null && typeof error === "object") {
    const code = "code" in error ? error.code : undefined;
    const safeCodes = [
      "ENOENT",
      "EACCES",
      "EPERM",
      "EISDIR",
      "ENOTDIR",
      "ETIMEDOUT",
      "ERR_MODULE_NOT_FOUND",
      "MODULE_NOT_FOUND",
      "ERR_DLOPEN_FAILED",
      "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
    ];
    if (typeof code === "string" && safeCodes.includes(code)) return code;
    if (typeof code === "number" && Number.isInteger(code) && code >= 1 && code <= 255) {
      return `External command exited with code ${code}`;
    }
    if ("killed" in error && error.killed === true) {
      return "External command was terminated (timeout or signal)";
    }
  }

  return "Unexpected error; sensitive details suppressed";
}

async function fetchDotenvPrivateKey(): Promise<string> {
  startupStage = "read-doppler-token";
  const token = (await readFile("/run/secrets/doppler_token", "utf8")).trim();

  if (!token) {
    throw new StartupError("Doppler token file is empty");
  }

  startupStage = "fetch-dotenv-private-key";
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

  startupStage = "validate-dotenv-private-key";
  const privateKey = stdout.trim();

  if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new StartupError("Invalid dotenvx private key");
  }

  return privateKey;
}

function parseLiteralConfiguration(source: string, privateKey: string): Record<string, string> {
  startupStage = "validate-configuration-format";
  const literalLine = /^\s*(?:#[^\r\n]*|[A-Za-z_][A-Za-z0-9_]*='[^'\r\n]*')?\s*$/;

  const invalidLine = source.split(/\r?\n/).findIndex((line) => !literalLine.test(line));
  if (invalidLine !== -1) {
    throw new StartupError(
      `Production configuration must use single-quoted literals (line ${invalidLine + 1})`,
    );
  }

  startupStage = "decrypt-configuration";
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
    throw new StartupError("Production configuration could not be decrypted");
  }

  return parsed;
}

async function start(): Promise<void> {
  const privateKey = await fetchDotenvPrivateKey();

  startupStage = "read-encrypted-configuration";
  const source = await readFile("/run/config/.env.production", "utf8");

  const parsed = parseLiteralConfiguration(source, privateKey);
  startupStage = "validate-runtime-configuration";
  const configuration = validateRuntimeConfiguration(parsed);

  startupStage = "initialize-runtime-configuration";
  initializeRuntimeEnvironment(configuration);

  // Load application modules only after configuration is ready.
  startupStage = "load-application";
  await import("./app.js");
}

start().catch((error: unknown) => {
  // Only known, sanitized messages and allowlisted codes may reach the log.
  console.error("Backend startup failed", {
    stage: startupStage,
    reason: safeFailureReason(error),
  });
  process.exitCode = 1;
});
