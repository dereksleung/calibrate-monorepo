import type { DevBindings } from "@calibrate/dev-bindings";

import {
  SHARED_COMPOSE_PROJECT_NAME,
  SHARED_DATABASE_HOST,
  SHARED_DATABASE_PORT,
  type PostgresRole,
} from "@calibrate/local-runtime-config";

export const SHARED_DB_HOST = SHARED_DATABASE_HOST;
export const SHARED_DB_PORT = SHARED_DATABASE_PORT;
export const COMPOSE_PROJECT_NAME = SHARED_COMPOSE_PROJECT_NAME;

export type FormatDevCommandOptions = {
  dotenvxAvailable?: boolean;
  role?: PostgresRole;
};

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function dotenvEnvAssignment(name: string, value: string): string {
  if (value.includes("'") || value.includes("\r") || value.includes("\n")) {
    throw new Error(`${name} contains unsupported dotenv characters.`);
  }

  return `${name}='${value}'`;
}

export function formatBackendDevCommand(
  bindings: DevBindings,
  dbName: string,
  { dotenvxAvailable = true, role }: FormatDevCommandOptions = {},
): string {
  if (dotenvxAvailable) {
    return [
      "npx dotenvx run --overload",
      "--env CALIBRATE_E2E=",
      `--env DB_HOST=${shellQuote(SHARED_DB_HOST)}`,
      `--env DB_PORT=${shellQuote(String(SHARED_DB_PORT))}`,
      `--env ${shellQuote(dotenvEnvAssignment("DB_NAME", dbName))}`,
      `--env PORT=${shellQuote(String(bindings.ports.backend))}`,
      `--env CORS_ORIGIN=${shellQuote(bindings.corsOrigin)}`,
      `--env WEBAUTHN_ORIGIN=${shellQuote(bindings.webauthnOrigin)}`,
      "-- npx nx run backend:dev",
    ].join(" ");
  }

  if (!role) {
    throw new Error("Machine-local Postgres role is required when dotenvx is unavailable.");
  }

  return [
    "CALIBRATE_DEMO=1",
    `DB_HOST=${shellQuote(SHARED_DB_HOST)}`,
    `DB_PORT=${shellQuote(String(SHARED_DB_PORT))}`,
    `DB_NAME=${shellQuote(dbName)}`,
    `DB_USER=${shellQuote(role.user)}`,
    `DB_PASSWORD=${shellQuote(role.password)}`,
    `PORT=${shellQuote(String(bindings.ports.backend))}`,
    `CORS_ORIGIN=${shellQuote(bindings.corsOrigin)}`,
    `WEBAUTHN_ORIGIN=${shellQuote(bindings.webauthnOrigin)}`,
    "npx nx run backend:demo",
  ].join(" ");
}

export function formatWebDevCommand(
  bindings: DevBindings,
  { dotenvxAvailable = true }: FormatDevCommandOptions = {},
): string {
  if (dotenvxAvailable) {
    return [
      "npx dotenvx run --overload",
      "--env CALIBRATE_E2E=",
      `--env VITE_API_BASE_URL=${shellQuote(bindings.viteApiBaseUrl)}`,
      `-- npx nx run web:dev -- --port ${shellQuote(String(bindings.ports.frontend))}`,
    ].join(" ");
  }

  return [
    `--env VITE_API_BASE_URL=${shellQuote(bindings.viteApiBaseUrl)}`,
    `VITE_API_BASE_URL=${shellQuote(bindings.viteApiBaseUrl)}`,
    `npx nx run web:dev -- --port ${shellQuote(String(bindings.ports.frontend))}`,
  ].join(" ");
}

export function printDevCommands(
  bindings: DevBindings,
  dbName: string,
  options: FormatDevCommandOptions = {},
): void {
  console.log("\nWorktree dev servers are ready. Start them in separate terminals:\n");
  console.log(formatBackendDevCommand(bindings, dbName, options));
  console.log(formatWebDevCommand(bindings, options));
  console.log("");
}
