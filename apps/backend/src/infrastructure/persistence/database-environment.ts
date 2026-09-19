import type { DatabaseConnectionConfig } from "./database-client.js";

import {
  getRuntimeEnvironmentValue,
  isDemoRuntime,
  usesProcessEnvironmentRuntime,
} from "../runtime-environment.js";

export function loadDatabaseConnectionConfigFromEnvironment(): DatabaseConnectionConfig {
  const config = {
    database: getDatabaseEnvironmentValue("DB_NAME"),
    host: getDatabaseEnvironmentValue("DB_HOST"),
    port: Number(getDatabaseEnvironmentValue("DB_PORT") || "5432"),
    user: getDatabaseEnvironmentValue("DB_USER"),
    password: getDatabaseEnvironmentValue("DB_PASSWORD"),
    maxConnections: 10,
  };

  if (
    usesProcessEnvironmentRuntime() &&
    (!config.database || !config.host || !config.user || !config.password || !Number.isInteger(config.port))
  ) {
    throw new Error(
      isDemoRuntime()
        ? "Demo database configuration is incomplete"
        : "E2E database configuration is incomplete",
    );
  }

  return config as DatabaseConnectionConfig;
}

function getDatabaseEnvironmentValue(name: string): string | undefined {
  return process.env[name] ?? getRuntimeEnvironmentValue(name);
}
