import path from "node:path";
import { fileURLToPath } from "node:url";

import { runDemoReset, type DemoSetupOptions, type DemoSetupResult } from "./demo-catalog-setup.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function runLocalDemoReset(
  directory = workspaceRoot,
  options: Omit<DemoSetupOptions, "directory"> = {},
): Promise<DemoSetupResult> {
  return runDemoReset({ directory, ...options });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalDemoReset().catch((error: unknown) => {
    console.error("Local demo reset failed.", error);
    process.exitCode = 1;
  });
}
