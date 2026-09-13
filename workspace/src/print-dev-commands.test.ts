import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import {
  dotenvEnvAssignment,
  formatBackendDevCommand,
  formatWebDevCommand,
  shellQuote,
} from "./print-dev-commands.js";

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

    expect(formatBackendDevCommand(bindings, "calibrate_wt_feature_ab12cd34")).toContain(
      shellQuote(dotenvEnvAssignment("DB_NAME", "calibrate_wt_feature_ab12cd34")),
    );
    expect(formatBackendDevCommand(bindings, "calibrate_wt_feature_ab12cd34")).toContain("PORT='3011'");
    expect(formatBackendDevCommand(bindings, "calibrate_wt_feature_ab12cd34")).toContain(
      "--env CALIBRATE_E2E=",
    );
    expect(formatWebDevCommand(bindings)).toContain("VITE_API_BASE_URL='/api/v1'");
    expect(formatWebDevCommand(bindings)).toContain("API_PROXY_TARGET='http://localhost:3011'");
    expect(formatWebDevCommand(bindings)).toContain("--env CALIBRATE_E2E=");
    expect(formatWebDevCommand(bindings)).toContain("--port '3010'");
  });

  it("prints demo runtime commands with the machine-local role when dotenvx is unavailable", () => {
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

    expect(backend).toContain("CALIBRATE_DEMO=1");
    expect(backend).toContain("npx nx run backend:demo");
    expect(backend).toContain("DB_USER='calibrate'");
    expect(backend).toContain("DB_PASSWORD='machine-local-password'");
    expect(backend).not.toContain("dotenvx");
    expect(web).toContain("VITE_API_BASE_URL='http://localhost:3011/api/v1'");
    expect(web).not.toContain("dotenvx");
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
