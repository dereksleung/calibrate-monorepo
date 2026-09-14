import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getDefaultMachineLocalRoleFilePath } from "@calibrate/local-runtime-config";

import {
  dotenvEnvAssignment,
  formatBackendDevCommand,
  formatWebDevCommand,
  shellQuote,
} from "./print-dev-commands.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "calibrate-print-dev-commands-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("print dev commands", () => {
  it("prints nx commands with the derived env overrides", () => {
    const bindings = {
      ports: { frontend: 3010, backend: 3011 },
      frontendUrl: "http://localhost:3010",
      backendUrl: "http://localhost:3011",
      viteApiBaseUrl: "/api/v1",
      corsOrigin: "http://localhost:3010",
      webauthnOrigin: "http://localhost:3010",
    };

    const backend = formatBackendDevCommand(bindings, "calibrate_wt_feature_ab12cd34", {
      role: {
        user: "dotenvx_user",
        password: "dotenvx_password",
        source: "dotenvx",
      },
    });

    expect(backend).toContain(
      shellQuote(dotenvEnvAssignment("DB_NAME", "calibrate_wt_feature_ab12cd34")),
    );
    expect(backend).toContain("PORT='3011'");
    expect(backend).toContain("--env CALIBRATE_E2E=");
    expect(backend).not.toContain("dotenvx_user");
    expect(backend).not.toContain("dotenvx_password");
    expect(formatWebDevCommand(bindings)).toContain("VITE_API_BASE_URL='/api/v1'");
    expect(formatWebDevCommand(bindings)).toContain(
      shellQuote(dotenvEnvAssignment("API_PROXY_TARGET", "http://localhost:3011")),
    );
    expect(formatWebDevCommand(bindings)).toContain("--env CALIBRATE_E2E=");
    expect(formatWebDevCommand(bindings)).toContain("--port '3010'");
  });

  it("loads local runtime and machine-local role files for normal development", () => {
    const bindings = {
      ports: { frontend: 3010, backend: 3011 },
      frontendUrl: "http://localhost:3010",
      backendUrl: "http://localhost:3011",
      viteApiBaseUrl: "http://localhost:3011/api/v1",
      corsOrigin: "http://localhost:3010",
      webauthnOrigin: "http://localhost:3010",
    };
    const role = {
      user: "calibrate",
      password: "machine-local-password",
      source: "machine-local" as const,
    };

    const backend = formatBackendDevCommand(bindings, "calibrate_wt_feature_ab12cd34", {
      dotenvxAvailable: false,
      role,
    });
    const web = formatWebDevCommand(bindings, { dotenvxAvailable: false });

    expect(backend).toContain("npx nx run backend:dev");
    expect(backend).toContain("--env-file '.local.env'");
    expect(backend).toContain(shellQuote(getDefaultMachineLocalRoleFilePath()));
    expect(backend).toContain(shellQuote(dotenvEnvAssignment("DB_NAME", "calibrate_wt_feature_ab12cd34")));
    expect(backend).not.toContain("machine-local-password");
    expect(backend).not.toContain("DB_USER");
    expect(backend).not.toContain("DB_PASSWORD");
    expect(backend).toContain("--env EMAIL_SERVICE_CREDENTIAL=");
    expect(backend).toContain("--env TRUST_PROXY_HOPS=0");
    expect(backend).not.toContain("CALIBRATE_DEMO");
    expect(web).toContain("VITE_API_BASE_URL='http://localhost:3011/api/v1'");
    expect(web).toContain("API_PROXY_TARGET='http://localhost:3011'");
    expect(web).not.toContain("dotenvx");
  });

  it("injects local runtime and machine-local role files through dotenvx", async () => {
    const directory = await createTemporaryDirectory();
    const localRuntimeFile = path.join(directory, ".local.env");
    const roleFile = path.join(directory, "shared-postgres.env");
    await writeFile(localRuntimeFile, "OTP_HMAC_KEY=local-runtime-key\n", "utf8");
    await writeFile(roleFile, "DB_USER=calibrate\nDB_PASSWORD=machine-local-password\n", "utf8");

    const output = execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      [
        "dotenvx",
        "run",
        "--overload",
        "--env-file",
        localRuntimeFile,
        "--env-file",
        roleFile,
        "--env",
        "DB_NAME=calibrate_wt_feature_ab12cd34",
        "--",
        "node",
        "-e",
        "process.stdout.write([process.env.OTP_HMAC_KEY, process.env.DB_USER, process.env.DB_NAME].join(':'))",
      ],
      { encoding: "utf8" },
    );

    expect(output.trim().endsWith("local-runtime-key:calibrate:calibrate_wt_feature_ab12cd34")).toBe(
      true,
    );
  });

  it("keeps shell metacharacters inside one generated argument", () => {
    const value = "calibrate; printf injected 'quoted'";
    const output = execFileSync("sh", ["-c", `printf '%s' ${shellQuote(value)}`], {
      encoding: "utf8",
    });

    expect(output).toBe(value);
  });

  it("keeps dotenv metacharacters literal in the generated assignment", () => {
    const assignment = dotenvEnvAssignment("DB_NAME", "foo$BAR#baz");
    const output = execFileSync("sh", ["-c", `printf '%s' ${shellQuote(assignment)}`], {
      encoding: "utf8",
    });

    expect(output).toBe("DB_NAME='foo$BAR#baz'");
  });

  it("rejects dotenv values that cannot be represented literally", () => {
    expect(() => dotenvEnvAssignment("DB_NAME", "foo'bar")).toThrow(
      "DB_NAME contains unsupported dotenv characters.",
    );
  });
});
