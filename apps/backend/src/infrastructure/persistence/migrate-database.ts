import { FileMigrationProvider, Migrator } from "kysely";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { DatabaseClient } from "./database-client.js";

export async function migrateDatabase(database: DatabaseClient, migrationFolder: string): Promise<void> {
  try {
    const migrator = new Migrator({
      db: database,
      provider: new FileMigrationProvider({ fs, path, migrationFolder }),
    });
    const { error, results } = await migrator.migrateToLatest();

    for (const result of results ?? []) {
      console.info("Database migration", { migration: result.migrationName, status: result.status });
    }

    if (error) throw error;
    console.info("Database migrations are up to date");
  } finally {
    await database.destroy();
  }
}
