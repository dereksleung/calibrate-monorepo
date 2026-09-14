import { DEMO_DATABASE_NAME } from "@calibrate/local-runtime-config";

import { isLinkedWorktreeDatabaseName } from "./worktree-database-name.js";

const SYSTEM_DATABASES = new Set(["postgres", "template0", "template1"]);

export function isTeardownDatabaseAllowed(
  databaseName: string,
  primaryDbName: string | undefined,
  expectedWorktreeDbName: string | undefined,
): boolean {
  if (SYSTEM_DATABASES.has(databaseName)) return false;
  if (databaseName === DEMO_DATABASE_NAME) return false;
  if (primaryDbName && databaseName === primaryDbName) return false;
  if (!expectedWorktreeDbName || databaseName !== expectedWorktreeDbName) return false;
  if (!isLinkedWorktreeDatabaseName(databaseName)) return false;
  return true;
}

export function explainTeardownRefusal(
  databaseName: string,
  primaryDbName: string | undefined,
  expectedWorktreeDbName: string | undefined,
): string {
  if (databaseName === DEMO_DATABASE_NAME) {
    return `Refusing to drop the demo database "${databaseName}".`;
  }
  if (primaryDbName && databaseName === primaryDbName) {
    return `Refusing to drop the primary checkout database "${databaseName}".`;
  }
  if (SYSTEM_DATABASES.has(databaseName)) {
    return `Refusing to drop system database "${databaseName}".`;
  }
  if (!isLinkedWorktreeDatabaseName(databaseName)) {
    return `Refusing to drop "${databaseName}". Only calibrate_wt_* databases created by worktree-setup may be dropped.`;
  }
  if (!expectedWorktreeDbName) {
    return `Refusing to drop "${databaseName}". Teardown is only available for this worktree's calibrate_wt_* database.`;
  }
  if (databaseName !== expectedWorktreeDbName) {
    return `Refusing to drop "${databaseName}". Only this worktree's database "${expectedWorktreeDbName}" may be dropped.`;
  }
  return `Refusing to drop "${databaseName}".`;
}
