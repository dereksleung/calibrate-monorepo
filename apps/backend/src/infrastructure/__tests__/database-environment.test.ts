import { afterEach, describe, expect, it, vi } from "vitest";

const { dotenvGet } = vi.hoisted(() => ({ dotenvGet: vi.fn() }));

vi.mock("@dotenvx/dotenvx", () => ({
  default: {
    get: dotenvGet,
  },
}));

import { loadDatabaseConnectionConfigFromEnvironment } from "../persistence/database-environment.js";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  dotenvGet.mockReset();
});

describe("loadDatabaseConnectionConfigFromEnvironment", () => {
  it("reads complete demo database settings from process env without dotenvx", () => {
    process.env.CALIBRATE_DEMO = "1";
    process.env.DB_NAME = "calibrate_demo";
    process.env.DB_HOST = "127.0.0.1";
    process.env.DB_PORT = "5432";
    process.env.DB_USER = "calibrate";
    process.env.DB_PASSWORD = "local-only";
    dotenvGet.mockReturnValue("dotenv-db");

    expect(loadDatabaseConnectionConfigFromEnvironment()).toEqual({
      database: "calibrate_demo",
      host: "127.0.0.1",
      port: 5432,
      user: "calibrate",
      password: "local-only",
      maxConnections: 10,
    });
    expect(dotenvGet).not.toHaveBeenCalled();
  });

  it("fails closed when demo database settings are incomplete", () => {
    process.env.CALIBRATE_DEMO = "1";
    delete process.env.DB_NAME;
    delete process.env.DB_HOST;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    dotenvGet.mockReturnValue("dotenv-db");

    expect(() => loadDatabaseConnectionConfigFromEnvironment()).toThrow(
      "Demo database configuration is incomplete",
    );
    expect(dotenvGet).not.toHaveBeenCalled();
  });
});
