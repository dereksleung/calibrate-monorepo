import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  execFileAsync: vi.fn(),
  parse: vi.fn(),
  logger: { error: vi.fn() },
  validate: vi.fn(),
  realValidate: vi.fn(),
  initialize: vi.fn(),
  loadApplication: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("node:child_process", () => ({
  execFile: Object.assign(vi.fn(), { [promisify.custom]: mocks.execFileAsync }),
}));
vi.mock("@dotenvx/dotenvx", () => ({
  default: { parse: mocks.parse, logger: mocks.logger },
}));
vi.mock("../infrastructure/runtime-environment.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../infrastructure/runtime-environment.js")>();
  mocks.realValidate.mockImplementation(actual.validateRuntimeConfiguration);
  return {
    ...actual,
    validateRuntimeConfiguration: mocks.validate,
    initializeRuntimeEnvironment: mocks.initialize,
  };
});

const token = "dp.st.synthetic-token";
const privateKey = "a".repeat(64);
const configuration = { DB_HOST: "postgres" };
let previousExitCode: typeof process.exitCode;
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  previousExitCode = process.exitCode;
  process.exitCode = undefined;
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.readFile.mockImplementation(async (path: string) =>
    path === "/run/secrets/doppler_token" ? `${token}\n` : "DB_HOST='postgres'\n",
  );
  mocks.execFileAsync.mockResolvedValue({ stdout: privateKey, stderr: "" });
  mocks.parse.mockReturnValue(configuration);
  mocks.validate.mockImplementation((values) => values);
  mocks.initialize.mockImplementation(() => {});
  mocks.loadApplication.mockImplementation(() => {});
  vi.doMock("../app.js", () => {
    mocks.loadApplication();
    return {};
  });
});

afterEach(() => {
  process.exitCode = previousExitCode;
  errorLog.mockRestore();
  vi.doUnmock("../app.js");
});

async function boot(outcome: "success" | "failure" = "failure") {
  await import("../startup.js");
  await vi.waitFor(() => {
    expect(outcome === "success" ? mocks.loadApplication : errorLog).toHaveBeenCalledTimes(1);
  });
}

function expectFailure(stage: string, reason: string | ReturnType<typeof expect.stringContaining>) {
  expect(errorLog).toHaveBeenCalledWith("Backend startup failed", { stage, reason });
  expect(process.exitCode).toBe(1);
}

describe("backend startup diagnostics", () => {
  it("initializes configuration before loading the app without changing process.env", async () => {
    const environment = { ...process.env };
    mocks.loadApplication.mockImplementation(() => {
      expect(mocks.initialize).toHaveBeenCalledWith(configuration);
    });

    await boot("success");

    expect(errorLog).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
    expect(process.env).toEqual(environment);
    expect(mocks.execFileAsync).toHaveBeenCalledWith(
      "/usr/local/bin/doppler",
      expect.any(Array),
      expect.objectContaining({ env: { HOME: "/tmp", DOPPLER_TOKEN: token } }),
    );
  });

  it.each(["ENOENT", "EACCES"])("reports token-file error %s without its raw message", async (code) => {
    mocks.readFile.mockRejectedValueOnce(Object.assign(new Error(token), { code }));

    await boot();

    expectFailure("read-doppler-token", code);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(token);
  });

  it("identifies an empty token file", async () => {
    mocks.readFile.mockResolvedValueOnce(" \n");
    await boot();
    expectFailure("read-doppler-token", "Doppler token file is empty");
  });

  it("reports Doppler failure without leaking its output, arguments, or environment", async () => {
    mocks.execFileAsync.mockRejectedValueOnce(
      Object.assign(new Error(`command includes ${token}`), {
        code: 1,
        stdout: privateKey,
        stderr: token,
        cmd: token,
        env: { DOPPLER_TOKEN: token },
      }),
    );

    await boot();

    expectFailure("fetch-dotenv-private-key", "External command exited with code 1");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(token);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(privateKey);
  });

  it("identifies a missing Doppler executable", async () => {
    mocks.execFileAsync.mockRejectedValueOnce(Object.assign(new Error(token), { code: "ENOENT" }));
    await boot();
    expectFailure("fetch-dotenv-private-key", "ENOENT");
  });

  it("identifies malformed key output without displaying it", async () => {
    mocks.execFileAsync.mockResolvedValueOnce({ stdout: "sensitive-bad-key", stderr: "" });
    await boot();
    expectFailure("validate-dotenv-private-key", "Invalid dotenvx private key");
  });

  it("identifies a missing encrypted configuration mount", async () => {
    mocks.readFile
      .mockResolvedValueOnce(token)
      .mockRejectedValueOnce(Object.assign(new Error(privateKey), { code: "ENOENT" }));
    await boot();
    expectFailure("read-encrypted-configuration", "ENOENT");
  });

  it("reports the invalid literal line without revealing its contents", async () => {
    mocks.readFile
      .mockResolvedValueOnce(token)
      .mockResolvedValueOnce(`# comment\nDB_PASSWORD="${privateKey}"\n`);
    await boot();
    expectFailure(
      "validate-configuration-format",
      "Production configuration must use single-quoted literals (line 2)",
    );
    expect(mocks.parse).not.toHaveBeenCalled();
  });

  it("reports decryption failure and suppresses dotenvx error details", async () => {
    const originalLogger = mocks.logger.error;
    mocks.parse.mockImplementationOnce(() => {
      mocks.logger.error(`private key ${privateKey}`);
      return { DB_HOST: "encrypted:unresolved" };
    });

    await boot();

    expectFailure("decrypt-configuration", "Production configuration could not be decrypted");
    expect(originalLogger).not.toHaveBeenCalled();
    expect(mocks.logger.error).toBe(originalLogger);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("reports invalid setting names without their values", async () => {
    mocks.validate.mockImplementationOnce(() => mocks.realValidate({ DB_PORT: token }));

    await boot();

    expectFailure("validate-runtime-configuration", expect.stringContaining("DB_PORT"));
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(token);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("suppresses unexpected validation errors instead of trusting their messages", async () => {
    mocks.validate.mockImplementationOnce(() => {
      throw new Error(privateKey);
    });
    await boot();
    expectFailure("validate-runtime-configuration", "Unexpected error; sensitive details suppressed");
  });

  it("reports a terminated Doppler command without its captured output", async () => {
    mocks.execFileAsync.mockRejectedValueOnce(Object.assign(new Error(token), { killed: true }));
    await boot();
    expectFailure("fetch-dotenv-private-key", "External command was terminated (timeout or signal)");
  });

  it("suppresses unexpected application import errors", async () => {
    mocks.loadApplication.mockImplementationOnce(() => {
      throw new Error(privateKey);
    });
    await boot();
    expectFailure("load-application", "Unexpected error; sensitive details suppressed");
  });
});
