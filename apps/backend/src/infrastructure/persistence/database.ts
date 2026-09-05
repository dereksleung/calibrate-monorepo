import { createDatabaseClient } from "./database-client.js";
import { loadDatabaseConnectionConfigFromEnvironment } from "./database-environment.js";

export * from "./database-client.js";
export { loadDatabaseConnectionConfigFromEnvironment } from "./database-environment.js";

export const databaseClient = createDatabaseClient(loadDatabaseConnectionConfigFromEnvironment());
