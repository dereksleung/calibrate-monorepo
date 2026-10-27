import { fileURLToPath } from "node:url";

import { runProductionEntrypoint } from "./infrastructure/production-startup.js";

await runProductionEntrypoint({
  failureMessage: "Database migration failed",
  loadStage: "run-migrations",
  run: async () => {
    // Opening the database must wait until production configuration is initialized.
    const { databaseClient } = await import("./infrastructure/persistence/database.js");
    const { migrateDatabase } = await import("./infrastructure/persistence/migrate-database.js");
    await migrateDatabase(databaseClient, fileURLToPath(new URL("./migrations/", import.meta.url)));
  },
});
