import { sql } from "kysely";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, inject, it } from "vitest";

import { TEST_DATABASE_CONFIG } from "../../../test/integration/database-context.js";
import { createIntegrationDatabaseClient } from "../../../test/integration/database.js";
import { createDatabaseClient } from "../persistence/database-client.js";
import { migrateDatabase } from "../persistence/migrate-database.js";

describe("release database migrations", () => {
  it("initializes an empty database and preserves migration history on a second run", async () => {
    const admin = createIntegrationDatabaseClient();
    const databaseName = `migration_test_${randomUUID().replace(/-/g, "")}`;
    const configuration = { ...inject(TEST_DATABASE_CONFIG), database: databaseName };
    const sourceMigrationFolder = path.resolve(import.meta.dirname, "../persistence/migrations");
    // The release check can exercise built files; normal integration runs use source files.
    const migrationFolder = process.env.CALIBRATE_TEST_MIGRATION_FOLDER ?? sourceMigrationFolder;
    const migrationNames = (await readdir(sourceMigrationFolder))
      .filter((name) => name.endsWith(".ts"))
      .map((name) => name.slice(0, -3))
      .sort();

    await sql`create database ${sql.id(databaseName)}`.execute(admin);
    const inspector = createDatabaseClient(configuration);

    try {
      expect(await inspector.introspection.getTables()).toEqual([]);

      await migrateDatabase(createDatabaseClient(configuration), migrationFolder);

      const tables = await inspector.introspection.getTables({ withInternalKyselyTables: true });
      expect(tables.map((table) => table.name)).toEqual(
        expect.arrayContaining([
          "users",
          "day_logs",
          "food_entries",
          "food_catalog",
          "sessions",
          "kysely_migration",
          "kysely_migration_lock",
        ]),
      );
      const history = await sql<{
        name: string;
        timestamp: string;
      }>`select name, timestamp from kysely_migration order by name`.execute(inspector);
      expect(history.rows.map((row) => row.name)).toEqual(migrationNames);

      await migrateDatabase(createDatabaseClient(configuration), migrationFolder);

      const repeatedHistory = await sql`select name, timestamp from kysely_migration order by name`.execute(
        inspector,
      );
      expect(repeatedHistory.rows).toEqual(history.rows);
    } finally {
      await inspector.destroy();
      await sql`drop database ${sql.id(databaseName)}`.execute(admin);
      await admin.destroy();
    }
  });
});
