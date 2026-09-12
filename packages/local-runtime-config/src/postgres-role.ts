import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const MACHINE_LOCAL_POSTGRES_USER = "calibrate";
export const MACHINE_LOCAL_ROLE_FILE_NAME = "shared-postgres.env";

export type PostgresRoleSource = "dotenvx" | "machine-local";

export type PostgresRole = {
  user: string;
  password: string;
  source: PostgresRoleSource;
};

export type ReadDotenvValue = (name: string) => string | null;

export type ResolvePostgresRoleOptions = {
  workspaceRoot: string;
  roleFilePath?: string;
  readDotenvValue?: ReadDotenvValue;
};

export function getDefaultMachineLocalRoleFilePath(): string {
  return path.join(os.homedir(), ".calibrate", MACHINE_LOCAL_ROLE_FILE_NAME);
}

export function createReadDotenvValue(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): ReadDotenvValue {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

  return (name) => {
    try {
      const value = execFileSync(npxCommand, ["dotenvx", "get", name], {
        cwd: workspaceRoot,
        encoding: "utf8",
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      return decryptableDotenvValue(value);
    } catch {
      return null;
    }
  };
}

export async function resolvePostgresRole({
  workspaceRoot,
  roleFilePath = getDefaultMachineLocalRoleFilePath(),
  readDotenvValue = createReadDotenvValue(workspaceRoot),
}: ResolvePostgresRoleOptions): Promise<PostgresRole> {
  const user = decryptableDotenvValue(readDotenvValue("DB_USER"));
  const password = decryptableDotenvValue(readDotenvValue("DB_PASSWORD"));
  if (user && password) {
    return { user, password, source: "dotenvx" };
  }

  const existing = await readMachineLocalRoleFile(roleFilePath);
  if (existing) {
    return { ...existing, source: "machine-local" };
  }

  const generated: PostgresRole = {
    user: MACHINE_LOCAL_POSTGRES_USER,
    password: randomBytes(32).toString("base64url"),
    source: "machine-local",
  };
  await writeMachineLocalRoleFile(roleFilePath, generated);
  return generated;
}

function decryptableDotenvValue(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("encrypted:")) return null;
  return value;
}

async function readMachineLocalRoleFile(
  filePath: string,
): Promise<{ user: string; password: string } | null> {
  if (!(await pathExists(filePath))) return null;

  const values = parseEnvAssignments(await readFile(filePath, "utf8"), filePath);
  const user = values.get("DB_USER");
  const password = values.get("DB_PASSWORD");
  if (!user || !password) {
    throw new Error(`Invalid shared Postgres role file in ${filePath}`);
  }

  return { user, password };
}

async function writeMachineLocalRoleFile(
  filePath: string,
  role: Pick<PostgresRole, "user" | "password">,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const contents = [
    "# Calibrate machine-local shared Postgres role.",
    "# Unique to this machine. Do not commit or copy dotenvx secrets here.",
    "",
    `DB_USER=${role.user}`,
    `DB_PASSWORD=${role.password}`,
    "",
  ].join("\n");
  await writeFile(filePath, contents, { encoding: "utf8", mode: 0o600 });
}

function parseEnvAssignments(contents: string, filePath: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      throw new Error(`Invalid shared Postgres role file in ${filePath}`);
    }

    values.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 1));
  }

  return values;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
