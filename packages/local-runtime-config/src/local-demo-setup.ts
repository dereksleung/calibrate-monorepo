import path from "node:path";
import { fileURLToPath } from "node:url";

import { runDemoSetup, type DemoSetupOptions, type DemoSetupResult } from "./demo-catalog-setup.js";
import { getLocalRuntimeEnvFilePath } from "./local-runtime-configuration.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function runLocalDemoSetup(
  directory = workspaceRoot,
  options: Omit<DemoSetupOptions, "directory"> = {},
): Promise<DemoSetupResult> {
  return runDemoSetup({ directory, ...options });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalDemoSetup()
    .then(() => {
      console.log(`Local demo runtime configuration ready at ${getLocalRuntimeEnvFilePath(workspaceRoot)}.`);
    })
    .catch((error: unknown) => {
      console.error("Local demo setup failed.", error);
      process.exitCode = 1;
    });
}
