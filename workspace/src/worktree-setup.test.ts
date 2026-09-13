import { describe, expect, it } from "vitest";

import {
  createSetupEnvironment,
  isPostgresDuplicateDatabaseError,
  resolveWorktreeDatabaseName,
  shouldEnsureLocalRuntimeConfiguration,
} from "./worktree-setup.js";

describe("worktree setup environment", () => {
  it("removes inherited E2E mode without mutating the parent environment", () => {
    const environment = {
      CALIBRATE_E2E: "1",
      DB_NAME: "calibrate_dev",
    };

    const setupEnvironment = createSetupEnvironment(environment);

    expect(setupEnvironment.CALIBRATE_E2E).toBeUndefined();
    expect(setupEnvironment.DB_NAME).toBe("calibrate_dev");
    expect(environment.CALIBRATE_E2E).toBe("1");
  });

  it("recognizes PostgreSQL duplicate-database errors", () => {
    expect(isPostgresDuplicateDatabaseError(Object.assign(new Error("duplicate"), { code: "42P04" }))).toBe(
      true,
    );
    expect(isPostgresDuplicateDatabaseError(Object.assign(new Error("other"), { code: "23505" }))).toBe(
      false,
    );
  });

  it("uses dotenvx DB_NAME on the primary checkout and derive calibrate_wt_* otherwise", () => {
    expect(
      resolveWorktreeDatabaseName({
        worktreeRoot: "/tmp/calibrate-monorepo-edge",
        isPrimary: true,
        dotenvDbName: "calibrate_dev",
      }),
    ).toBe("calibrate_dev");
    expect(
      resolveWorktreeDatabaseName({
        worktreeRoot: "/tmp/calibrate-monorepo-edge",
        isPrimary: true,
        dotenvDbName: null,
      }),
    ).toMatch(/^calibrate_wt_/);
    expect(
      resolveWorktreeDatabaseName({
        worktreeRoot: "/tmp/linked-feature",
        isPrimary: false,
        dotenvDbName: "calibrate_dev",
      }),
    ).toMatch(/^calibrate_wt_/);
  });

  it("creates local runtime configuration when the resolved role is machine-local", () => {
    expect(
      shouldEnsureLocalRuntimeConfiguration({
        user: "calibrate",
        password: "machine-local-password",
        source: "machine-local",
      }),
    ).toBe(true);
    expect(
      shouldEnsureLocalRuntimeConfiguration({
        user: "dotenvx-user",
        password: "dotenvx-password",
        source: "dotenvx",
      }),
    ).toBe(false);
  });
});
