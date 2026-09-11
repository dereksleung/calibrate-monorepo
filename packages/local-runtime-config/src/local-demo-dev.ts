import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDemoEnvironment,
  getDemoDockerProjectName,
  runDemoCommand,
  type DemoCommand,
  type DemoCommandRunner,
} from "./demo-catalog-setup.js";
import { LOCAL_RUNTIME_ENV_FILE_NAME, readLocalRuntimeConfiguration } from "./local-runtime-configuration.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const DEMO_FRONTEND_URL = "http://localhost:3000/calibrate-monorepo/signup-login";
export const DEMO_SETUP_REQUIRED_MESSAGE = `Local demo setup has not been completed. Run \`npx nx run @calibrate/local-runtime-config:demo-setup\` first, then retry \`npx nx run @calibrate/local-runtime-config:demo-dev\`. Missing file: ${LOCAL_RUNTIME_ENV_FILE_NAME}.`;

export type DemoDevProcessStarter = (processes: DemoCommand[]) => Promise<void>;

export type DemoDevOptions = {
  directory: string;
  output?: (message: string) => void;
  runCommand?: DemoCommandRunner;
  startProcesses?: DemoDevProcessStarter;
};

export async function runDemoDev({
  directory,
  output = console.log,
  runCommand = runDemoCommand,
  startProcesses = startDemoDevProcesses,
}: DemoDevOptions): Promise<void> {
  const configuration = await readLocalRuntimeConfiguration(directory);
  if (!configuration) {
    throw new Error(DEMO_SETUP_REQUIRED_MESSAGE);
  }

  const environment = createDemoEnvironment(configuration);

  try {
    await runCommand({
      command: "docker",
      args: [
        "compose",
        "--project-name",
        getDemoDockerProjectName(directory),
        "up",
        "--detach",
        "--wait",
        "postgres",
      ],
      cwd: directory,
      environment,
    });
  } catch (error: unknown) {
    throw new Error(
      "Docker Desktop must be running to start the local demo. Start Docker Desktop, then retry. If this is a fresh clone, run `npx nx run @calibrate/local-runtime-config:demo-setup` first.",
      { cause: error },
    );
  }

  output(`Local demo is running at ${DEMO_FRONTEND_URL}`);
  output("Open that URL and choose Start local test session. Demo mode does not require private keys.");

  await startProcesses([
    {
      command: "npx",
      args: ["nx", "run", "backend:demo"],
      cwd: directory,
      environment,
    },
    {
      command: "npx",
      args: ["nx", "run", "web:dev"],
      cwd: directory,
      environment,
    },
  ]);
}

export function runLocalDemoDev(
  directory = workspaceRoot,
  options: Omit<DemoDevOptions, "directory"> = {},
): Promise<void> {
  return runDemoDev({ directory, ...options });
}

async function startDemoDevProcesses(processes: DemoCommand[]): Promise<void> {
  const children = processes.map((processCommand) =>
    spawn(processCommand.command, processCommand.args, {
      cwd: processCommand.cwd,
      env: processCommand.environment,
      stdio: "inherit",
    }),
  );

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const stop = (signal: NodeJS.Signals = "SIGTERM") => {
      for (const child of children) {
        if (!child.killed) child.kill(signal);
      }
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      stop();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    process.once("SIGINT", () => finish());
    process.once("SIGTERM", () => finish());

    for (const child of children) {
      child.once("error", (error) => finish(error));
      child.once("exit", (exitCode, signal) => {
        if (signal === "SIGINT" || signal === "SIGTERM") {
          finish();
          return;
        }

        if (exitCode === 0) {
          finish();
          return;
        }

        finish(new Error(`A demo-dev process exited with code ${exitCode ?? "unknown"}`));
      });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalDemoDev().catch((error: unknown) => {
    console.error("Local demo failed to start.", error);
    process.exitCode = 1;
  });
}
