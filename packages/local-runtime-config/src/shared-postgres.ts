import { Pool } from "pg";

import type { PostgresRole } from "./postgres-role.js";

import { isTcpPortOpen, shouldStartComposePostgres, waitForPostgresReady } from "./postgres-health.js";

export const SHARED_COMPOSE_PROJECT_NAME = "calibrate-shared";
export const SHARED_DATABASE_HOST = "127.0.0.1";
export const SHARED_DATABASE_PORT = 5433;
export const SHARED_BOOTSTRAP_DATABASE = "postgres";

export const SHARED_POSTGRES_ROLE_MISMATCH_MESSAGE =
  "Shared Postgres is running on 127.0.0.1:5433 but the resolved role cannot authenticate. If this volume was initialized with different credentials, recreate it with `docker compose -p calibrate-shared down --volumes`. Tear down any leftover calibrate-demo-* project on this port first.";

export type SharedPostgresCommand = {
  command: string;
  args: string[];
  cwd: string;
  environment: NodeJS.ProcessEnv;
};

export type SharedPostgresAdminQuery = {
  text: string;
  values?: unknown[];
};

export type SharedPostgresAdminResult = {
  rowCount: number;
  rows: Record<string, unknown>[];
};

export type SharedPostgresAdminClient = {
  query: (query: SharedPostgresAdminQuery) => Promise<SharedPostgresAdminResult>;
  end?: () => Promise<void>;
};

export type ConnectSharedPostgresAdmin = (
  role: PostgresRole,
  database?: string,
) => Promise<SharedPostgresAdminClient>;

export type SharedPostgresOptions = {
  role: PostgresRole;
  connectAdmin?: ConnectSharedPostgresAdmin;
};

export type EnsureSharedPostgresOptions = SharedPostgresOptions & {
  directory: string;
  runCommand: (command: SharedPostgresCommand) => Promise<void>;
  isPortOpen?: (host: string, port: number) => Promise<boolean>;
  waitUntilReady?: (role: PostgresRole) => Promise<void>;
  environment?: NodeJS.ProcessEnv;
};

export function createSharedPostgresComposeEnvironment(
  role: PostgresRole,
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...environment,
    COMPOSE_PROJECT_NAME: SHARED_COMPOSE_PROJECT_NAME,
    DB_USER: role.user,
    DB_PASSWORD: role.password,
  };
}

export function isPostgresDuplicateDatabaseError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "42P04";
}

export function isPostgresInvalidPasswordError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "28P01";
}

export function quotePostgresIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function ensureCalibrateSharedPostgres({
  directory,
  role,
  runCommand,
  isPortOpen = isTcpPortOpen,
  connectAdmin = connectSharedPostgresAdmin,
  waitUntilReady,
  environment = process.env,
}: EnsureSharedPostgresOptions): Promise<void> {
  const isOpen = await isPortOpen(SHARED_DATABASE_HOST, SHARED_DATABASE_PORT);
  if (shouldStartComposePostgres(isOpen)) {
    await runCommand({
      command: "docker",
      args: [
        "compose",
        "--project-name",
        SHARED_COMPOSE_PROJECT_NAME,
        "up",
        "--detach",
        "--wait",
        "postgres",
      ],
      cwd: directory,
      environment: createSharedPostgresComposeEnvironment(role, environment),
    });
  }

  if (waitUntilReady) {
    await waitUntilReady(role);
  } else {
    await waitForSharedPostgresReady(role, connectAdmin);
  }
}

export async function createDatabaseIfMissing(
  databaseName: string,
  { role, connectAdmin = connectSharedPostgresAdmin }: SharedPostgresOptions,
): Promise<void> {
  const client = await connectAdmin(role, SHARED_BOOTSTRAP_DATABASE);
  try {
    const existing = await client.query({
      text: "SELECT 1 FROM pg_database WHERE datname = $1",
      values: [databaseName],
    });
    if (existing.rowCount > 0) return;

    try {
      await client.query({
        text: `CREATE DATABASE ${quotePostgresIdentifier(databaseName)}`,
      });
    } catch (error: unknown) {
      if (!isPostgresDuplicateDatabaseError(error)) throw error;
    }
  } finally {
    await client.end?.();
  }
}

export async function dropDatabaseIfExists(
  databaseName: string,
  { role, connectAdmin = connectSharedPostgresAdmin }: SharedPostgresOptions,
): Promise<void> {
  const client = await connectAdmin(role, SHARED_BOOTSTRAP_DATABASE);
  try {
    await client.query({
      text: `DROP DATABASE IF EXISTS ${quotePostgresIdentifier(databaseName)} WITH (FORCE)`,
    });
  } finally {
    await client.end?.();
  }
}

export async function connectSharedPostgresAdmin(
  role: PostgresRole,
  database = SHARED_BOOTSTRAP_DATABASE,
): Promise<SharedPostgresAdminClient> {
  const pool = new Pool({
    database,
    host: SHARED_DATABASE_HOST,
    port: SHARED_DATABASE_PORT,
    user: role.user,
    password: role.password,
    connectionTimeoutMillis: 1_000,
  });

  return {
    query: async ({ text, values }) => {
      const result = await pool.query(text, values);
      return { rowCount: result.rowCount ?? 0, rows: result.rows as Record<string, unknown>[] };
    },
    end: async () => {
      await pool.end();
    },
  };
}

async function waitForSharedPostgresReady(
  role: PostgresRole,
  connectAdmin: ConnectSharedPostgresAdmin,
): Promise<void> {
  await waitForPostgresReady(async () => {
    const client = await connectAdmin(role, SHARED_BOOTSTRAP_DATABASE);
    try {
      await client.query({ text: "SELECT 1" });
    } catch (error: unknown) {
      if (isPostgresInvalidPasswordError(error)) {
        throw new Error(SHARED_POSTGRES_ROLE_MISMATCH_MESSAGE, { cause: error });
      }
      throw error;
    } finally {
      await client.end?.();
    }
  });
}
