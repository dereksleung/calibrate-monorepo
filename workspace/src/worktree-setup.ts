import { deriveDevBindings } from "@calibrate/dev-bindings";
import {
  createDatabaseIfMissing,
  createReadDotenvValue,
  ensureCalibrateSharedPostgres,
  isPostgresDuplicateDatabaseError,
  resolvePostgresRole,
  SHARED_COMPOSE_PROJECT_NAME,
  SHARED_DATABASE_HOST,
  SHARED_DATABASE_PORT,
  type PostgresRole,
  type SharedPostgresCommand,
} from "@calibrate/local-runtime-config";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureEnvKeys } from "./env-keys.js";
import { isPrimaryWorktree } from "./git-worktree.js";
import { dotenvEnvAssignment, printDevCommands } from "./print-dev-commands.js";
import { deriveLinkedWorktreeDatabaseName } from "./worktree-database-name.js";
import { resolveStickyPortPair } from "./worktree-ports.js";
import { readWorktreeState, writeWorktreeState } from "./worktree-state.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

export { isPostgresDuplicateDatabaseError };

export function createSetupEnvironment(environment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const setupEnvironment = { ...environment };
  delete setupEnvironment.CALIBRATE_E2E;
  delete setupEnvironment.CALIBRATE_DEMO;
  return setupEnvironment;
}

export function resolveWorktreeDatabaseName({
  worktreeRoot,
  isPrimary,
  dotenvDbName,
}: {
  worktreeRoot: string;
  isPrimary: boolean;
  dotenvDbName: string | null;
}): string {
  if (isPrimary && dotenvDbName) return dotenvDbName;
  return deriveLinkedWorktreeDatabaseName(worktreeRoot);
}

async function runSharedPostgresCommand(command: SharedPostgresCommand): Promise<void> {
  execFileSync(command.command, command.args, {
    cwd: command.cwd,
    env: command.environment,
    stdio: "inherit",
  });
}

function runDotenvxMigrations(dbNameAssignment: string): void {
  execFileSync(
    npxCommand,
    [
      "dotenvx",
      "run",
      "--overload",
      "--env",
      dbNameAssignment,
      "--env",
      `DB_HOST=${SHARED_DATABASE_HOST}`,
      "--env",
      `DB_PORT=${SHARED_DATABASE_PORT}`,
      "--env",
      "CALIBRATE_E2E=",
      "--",
      "npx",
      "nx",
      "run",
      "backend:kysely",
      "migrate:latest",
    ],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      env: createSetupEnvironment(),
    },
  );
}

function runMachineLocalMigrations(dbName: string, role: PostgresRole): void {
  execFileSync(npxCommand, ["nx", "run", "backend:kysely", "migrate:latest"], {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: {
      ...createSetupEnvironment(),
      DB_HOST: SHARED_DATABASE_HOST,
      DB_PORT: String(SHARED_DATABASE_PORT),
      DB_NAME: dbName,
      DB_USER: role.user,
      DB_PASSWORD: role.password,
    },
  });
}

export async function runWorktreeSetup(): Promise<void> {
  const hasEnvKeys = await ensureEnvKeys(workspaceRoot);
  const previousState = await readWorktreeState(workspaceRoot);
  const ports = await resolveStickyPortPair(previousState?.bindings.ports, 3000, {
    worktreeRoot: workspaceRoot,
  });
  const bindings = deriveDevBindings(ports);
  const role = await resolvePostgresRole({ workspaceRoot });
  const dotenvDbName = hasEnvKeys ? createReadDotenvValue(workspaceRoot)("DB_NAME") : null;
  const dbName = resolveWorktreeDatabaseName({
    worktreeRoot: workspaceRoot,
    isPrimary: isPrimaryWorktree(workspaceRoot),
    dotenvDbName,
  });

  await ensureCalibrateSharedPostgres({
    directory: workspaceRoot,
    role,
    runCommand: runSharedPostgresCommand,
    environment: {
      ...createSetupEnvironment(),
      COMPOSE_PROJECT_NAME: SHARED_COMPOSE_PROJECT_NAME,
    },
  });
  await createDatabaseIfMissing(dbName, { role });

  if (role.source === "dotenvx") {
    runDotenvxMigrations(dotenvEnvAssignment("DB_NAME", dbName));
  } else {
    runMachineLocalMigrations(dbName, role);
  }

  await writeWorktreeState(workspaceRoot, {
    dbName,
    dbHost: SHARED_DATABASE_HOST,
    dbPort: SHARED_DATABASE_PORT,
    bindings,
  });

  console.log(`Worktree database: ${dbName}`);
  printDevCommands(bindings, dbName, {
    dotenvxAvailable: role.source === "dotenvx",
    role,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runWorktreeSetup().catch((error: unknown) => {
    console.error("worktree-setup failed.", error);
    process.exitCode = 1;
  });
}
