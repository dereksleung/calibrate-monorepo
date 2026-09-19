import { randomUUID } from "node:crypto";
import { access, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { createReadDotenvValue, MACHINE_LOCAL_POSTGRES_USER, resolvePostgresRole } from "./postgres-role.js";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const envKeysPath = path.join(workspaceRoot, ".env.keys");
const originalDotenvPrivateKey = process.env.DOTENV_PRIVATE_KEY;
const temporaryDirectories: string[] = [];
let relocatedEnvKeysAsidePath: string | undefined;

afterEach(async () => {
  if (relocatedEnvKeysAsidePath) {
    await rename(relocatedEnvKeysAsidePath, envKeysPath).catch(() => undefined);
    relocatedEnvKeysAsidePath = undefined;
  }

  if (originalDotenvPrivateKey === undefined) {
    delete process.env.DOTENV_PRIVATE_KEY;
  } else {
    process.env.DOTENV_PRIVATE_KEY = originalDotenvPrivateKey;
  }

  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "calibrate-postgres-role-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("resolvePostgresRole", () => {
  it("prefers decryptable dotenvx DB_USER and DB_PASSWORD without writing the machine-local file", async () => {
    const directory = await createTemporaryDirectory();
    const roleFilePath = path.join(directory, "shared-postgres.env");

    const role = await resolvePostgresRole({
      workspaceRoot,
      roleFilePath,
      readDotenvValue: (name) => {
        if (name === "DB_USER") return "dotenvx_user";
        if (name === "DB_PASSWORD") return "dotenvx_password";
        return null;
      },
    });

    expect(role).toEqual({
      user: "dotenvx_user",
      password: "dotenvx_password",
      source: "dotenvx",
    });
    await expect(access(roleFilePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("treats dotenvx ciphertext as missing credentials", async () => {
    const directory = await createTemporaryDirectory();
    const roleFilePath = path.join(directory, "shared-postgres.env");

    const role = await resolvePostgresRole({
      workspaceRoot,
      roleFilePath,
      readDotenvValue: () => "encrypted:not-a-decrypted-secret",
    });

    expect(role.source).toBe("machine-local");
    expect(role.user).toBe(MACHINE_LOCAL_POSTGRES_USER);
    await expect(readFile(roleFilePath, "utf8")).resolves.toContain(`DB_PASSWORD=${role.password}`);
  });

  it("falls back to a generated machine-local role when dotenvx cannot decrypt DB credentials", async () => {
    const directory = await createTemporaryDirectory();
    const roleFilePath = path.join(directory, "shared-postgres.env");

    const first = await resolvePostgresRole({
      workspaceRoot,
      roleFilePath,
      readDotenvValue: () => null,
    });
    const second = await resolvePostgresRole({
      workspaceRoot,
      roleFilePath,
      readDotenvValue: () => null,
    });

    expect(first.source).toBe("machine-local");
    expect(first.user).toBe(MACHINE_LOCAL_POSTGRES_USER);
    expect(first.password.length).toBeGreaterThan(16);
    expect(second).toEqual(first);
    expect(await readFile(roleFilePath, "utf8")).toContain(`DB_USER=${first.user}`);
    expect(await readFile(roleFilePath, "utf8")).toContain(`DB_PASSWORD=${first.password}`);
  });

  it("concurrently resolves the one machine-local role", async () => {
    const directory = await createTemporaryDirectory();
    const roleFilePath = path.join(directory, "shared-postgres.env");

    const roles = await Promise.all(
      Array.from({ length: 8 }, () =>
        resolvePostgresRole({
          workspaceRoot,
          roleFilePath,
          readDotenvValue: () => null,
        }),
      ),
    );

    expect(new Set(roles.map((role) => role.password)).size).toBe(1);
    expect(await readFile(roleFilePath, "utf8")).toContain(`DB_PASSWORD=${roles[0]?.password}`);
  });

  it("uses the machine-local role when this checkout has no dotenvx private key", async () => {
    const directory = await createTemporaryDirectory();
    const roleFilePath = path.join(directory, "shared-postgres.env");
    const asidePath = path.join(os.tmpdir(), `calibrate-env-keys-${randomUUID()}`);
    const hadEnvKeys = await pathExists(envKeysPath);
    const previousDotenvPrivateKey = process.env.DOTENV_PRIVATE_KEY;

    try {
      if (hadEnvKeys) {
        await rename(envKeysPath, asidePath);
        relocatedEnvKeysAsidePath = asidePath;
      }
      delete process.env.DOTENV_PRIVATE_KEY;

      const role = await resolvePostgresRole({
        workspaceRoot,
        roleFilePath,
        readDotenvValue: createReadDotenvValue(workspaceRoot, { ...process.env }),
      });

      expect(role.source).toBe("machine-local");
      expect(role.user).toBe(MACHINE_LOCAL_POSTGRES_USER);
      expect(await readFile(roleFilePath, "utf8")).toContain(`DB_PASSWORD=${role.password}`);
    } finally {
      if (hadEnvKeys) {
        await rename(asidePath, envKeysPath).catch(() => undefined);
        relocatedEnvKeysAsidePath = undefined;
      }
      if (previousDotenvPrivateKey === undefined) {
        delete process.env.DOTENV_PRIVATE_KEY;
      } else {
        process.env.DOTENV_PRIVATE_KEY = previousDotenvPrivateKey;
      }
    }

    if (hadEnvKeys) {
      await expect(pathExists(envKeysPath)).resolves.toBe(true);
    }
  });
});

describe("createReadDotenvValue", () => {
  it("returns null for an unknown dotenv name instead of throwing", () => {
    const readDotenvValue = createReadDotenvValue(workspaceRoot, {
      ...process.env,
      DOTENV_PRIVATE_KEY: "not-a-real-key",
    });

    expect(readDotenvValue("DB_USER_THAT_DOES_NOT_EXIST")).toBeNull();
  });
});
