import {
  createReadDotenvValue,
  dropDatabaseIfExists,
  resolvePostgresRole,
} from "@calibrate/local-runtime-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureEnvKeys } from "./env-keys.js";
import { isPrimaryWorktree } from "./git-worktree.js";
import { deriveLinkedWorktreeDatabaseName } from "./worktree-database-name.js";
import {
  deleteWorktreeState,
  getWorktreeStatePath,
  readWorktreeState,
  type WorktreeDevState,
} from "./worktree-state.js";
import { explainTeardownRefusal, isTeardownDatabaseAllowed } from "./worktree-teardown-guard.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export type DatabaseArgument =
  | { kind: "omitted" }
  | { kind: "provided"; value: string }
  | { kind: "invalid"; message: string };

export function parseDatabaseArgument(argv: string[]): DatabaseArgument {
  let result: DatabaseArgument = { kind: "omitted" };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    let value: string | undefined;

    if (argument === "--database") {
      value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        return {
          kind: "invalid",
          message: "Invalid --database argument. Pass --database <name>.",
        };
      }
      index += 1;
    } else if (argument.startsWith("--database=")) {
      value = argument.slice("--database=".length);
      if (!value) {
        return {
          kind: "invalid",
          message: "Invalid --database argument. Pass --database <name>.",
        };
      }
    } else {
      return {
        kind: "invalid",
        message: "Unexpected worktree teardown argument. Use --database <name>.",
      };
    }

    if (result.kind !== "omitted") {
      return {
        kind: "invalid",
        message: "Invalid --database argument. Pass --database once.",
      };
    }

    result = { kind: "provided", value };
  }

  return result;
}

export async function resolveTeardownDatabaseName(
  argv: string[],
  readState: () => Promise<WorktreeDevState | null> = () => readWorktreeState(workspaceRoot),
): Promise<string | undefined> {
  const databaseArgument = parseDatabaseArgument(argv);
  if (databaseArgument.kind === "invalid") {
    throw new Error(databaseArgument.message);
  }
  if (databaseArgument.kind === "provided") {
    return databaseArgument.value;
  }

  return (await readState())?.dbName;
}

export async function runWorktreeTeardown(argv = process.argv.slice(2)): Promise<void> {
  const databaseName = await resolveTeardownDatabaseName(argv);
  const hasEnvKeys = await ensureEnvKeys(workspaceRoot);

  if (!databaseName) {
    throw new Error(
      `Missing worktree database name. Pass --database <name> or run worktree-setup in this checkout first (${getWorktreeStatePath(workspaceRoot)}).`,
    );
  }

  const dotenvDbName = hasEnvKeys ? createReadDotenvValue(workspaceRoot)("DB_NAME") : null;
  const expectedWorktreeDbName =
    !isPrimaryWorktree(workspaceRoot) || !dotenvDbName
      ? deriveLinkedWorktreeDatabaseName(workspaceRoot)
      : undefined;
  if (!isTeardownDatabaseAllowed(databaseName, dotenvDbName ?? undefined, expectedWorktreeDbName)) {
    throw new Error(explainTeardownRefusal(databaseName, dotenvDbName ?? undefined, expectedWorktreeDbName));
  }

  const role = await resolvePostgresRole({ workspaceRoot });
  await dropDatabaseIfExists(databaseName, { role });
  await deleteWorktreeState(workspaceRoot);
  console.log("Deleted .worktree-dev.json. Shared Postgres is still running.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runWorktreeTeardown().catch((error: unknown) => {
    console.error("worktree-teardown failed.", error);
    process.exitCode = 1;
  });
}
