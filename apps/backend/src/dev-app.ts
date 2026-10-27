import dotenvx from "@dotenvx/dotenvx";

import {
  initializeRuntimeEnvironment,
  RuntimeConfigurationError,
  validateRuntimeConfiguration,
} from "./infrastructure/runtime-environment.js";

let startupStage = "load-local-configuration";

async function start(): Promise<void> {
  // Preserve environment overrides from the worktree launcher and shell.
  dotenvx.config({ path: ".env", envKeysFile: ".env.keys", strict: true, quiet: true });

  startupStage = "validate-runtime-configuration";
  const environment = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  const configuration = validateRuntimeConfiguration(environment);
  if (!configuration.CORS_ORIGIN?.trim()) {
    throw new RuntimeConfigurationError("CORS_ORIGIN must be configured");
  }

  startupStage = "initialize-runtime-configuration";
  initializeRuntimeEnvironment(configuration);

  // Database and container modules read configuration during import.
  startupStage = "load-application";
  await import("./app.js");
}

start().catch((error: unknown) => {
  let reason = "Unexpected error; sensitive details suppressed";
  if (error instanceof RuntimeConfigurationError) {
    reason = error.message;
  } else if (startupStage === "load-local-configuration") {
    reason = "Check .env and .env.keys or DOTENV_PRIVATE_KEY; sensitive details suppressed";
  }

  console.error("Backend development startup failed", {
    stage: startupStage,
    reason,
  });
  process.exitCode = 1;
});
