import type { DatabaseConnectionConfig } from "./database-client.js";

import {
  getRuntimeEnvironmentValue,
  isDemoRuntime,
  usesProcessEnvironmentRuntime,
} from "../runtime-environment.js";

export function loadDatabaseConnectionConfigFromEnvironment(): DatabaseConnectionConfig {
  const config = {
    database: getRuntimeEnvironmentValue("DB_NAME"),
    host: getRuntimeEnvironmentValue("DB_HOST"),
    port: Number(getRuntimeEnvironmentValue("DB_PORT") || "5432"),
    user: getRuntimeEnvironmentValue("DB_USER"),
    password: getRuntimeEnvironmentValue("DB_PASSWORD"),
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
