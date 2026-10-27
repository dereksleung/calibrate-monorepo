import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  DeploymentError,
  readUpload,
  validateConfiguration,
  validateImage,
  deployRelease,
  checkBackendHealth,
  composeCommand,
  main,
} from "../deploy-calibrate.mjs";

const image = `dereksleung407/calibrate@sha256:${"a".repeat(64)}`;
const oldConfig = Buffer.from("DB_PASSWORD='encrypted:previous'\n");
const candidate = Buffer.from("DB_PASSWORD='encrypted:candidate'\n");

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "deploy-calibrate-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("accepts literal encrypted configuration and an approved image digest", () => {
  validateConfiguration(Buffer.from("# production\nDB_HOST='postgres'\nDB_PASSWORD='encrypted:synthetic'\n"));
  assert.equal(validateImage(Buffer.from(`${image}\n`)), image);
});

test("rejects plaintext secrets, shell syntax, duplicates, and uploaded decryption keys without logging values", () => {
  for (const source of [
    'DB_PASSWORD="sensitive-value-$(id)"\n',
    "DB_PASSWORD='sensitive-value'\n",
    "DB_HOST='postgres'\nDB_HOST='other'\n",
    "DOTENV_PRIVATE_KEY_PRODUCTION='sensitive-value'\n",
    "DOPPLER_TOKEN='sensitive-value'\n",
    "# empty artifact\n",
  ]) {
    assert.throws(
      () => validateConfiguration(Buffer.from(source)),
      (error) => {
        assert(error instanceof DeploymentError);
        assert(!error.message.includes("sensitive-value"));
        return true;
      },
    );
  }
});

test("rejects mutable tags, other repositories, and extra arguments", () => {
  for (const value of [
    "dereksleung407/calibrate:latest",
    `evil/image@sha256:${"a".repeat(64)}`,
    `${image}\n--privileged`,
  ]) {
    assert.throws(() => validateImage(Buffer.from(value)), DeploymentError);
  }
});

test("snapshots bounded regular uploads and rejects symlinks, directories, and wrong ownership", (t) => {
  const directory = fixture(t);
  writeFileSync(join(directory, "valid"), "candidate");
  symlinkSync(join(directory, "valid"), join(directory, "link"));
  assert.equal(readUpload(directory, "valid", process.getuid(), 100).toString(), "candidate");
  assert.throws(() => readUpload(directory, "link", process.getuid(), 100), DeploymentError);
  assert.throws(() => readUpload(directory, "valid", process.getuid(), 3), DeploymentError);
  assert.throws(() => readUpload(directory, "valid", process.getuid() + 1, 100), DeploymentError);
});

function releaseFixture(t, failAt) {
  const appDir = fixture(t);
  writeFileSync(join(appDir, ".env.production"), oldConfig);
  const calls = [];
  const compose = async (_image, args) => {
    calls.push(args);
    if (failAt?.(args)) throw new Error("synthetic command failure");
    return "";
  };
  return { appDir, calls, compose, log: () => {} };
}

test("runs migrations before backend recreation and records config backups and digest", async (t) => {
  const setup = releaseFixture(t);
  let healthCalls = 0;
  await deployRelease(candidate, image, {
    ...setup,
    checkHealth: async () => {
      healthCalls++;
    },
  });
  const migration = setup.calls.findIndex((args) => args.includes("--exit-code-from"));
  const backend = setup.calls.findIndex((args) => args.at(-1) === "backend");
  assert(migration >= 0 && backend > migration);
  assert(setup.calls[backend].includes("--force-recreate"));
  assert.deepEqual(readFileSync(join(setup.appDir, ".env.production")), candidate);
  assert.deepEqual(readFileSync(join(setup.appDir, ".env.production.previous")), oldConfig);
  assert(readFileSync(join(setup.appDir, "release.env"), "utf8").includes(image));
  assert.equal(healthCalls, 1);
});

test("pull failure leaves installed configuration untouched", async (t) => {
  const setup = releaseFixture(t, (args) => args[0] === "pull");
  await assert.rejects(deployRelease(candidate, image, setup));
  assert.deepEqual(readFileSync(join(setup.appDir, ".env.production")), oldConfig);
});

test("migration failure stops the job and restores configuration without restarting backend", async (t) => {
  const setup = releaseFixture(t, (args) => args.includes("--exit-code-from"));
  await assert.rejects(deployRelease(candidate, image, setup));
  assert.deepEqual(readFileSync(join(setup.appDir, ".env.production")), oldConfig);
  assert(setup.calls.some((args) => args[0] === "stop" && args.at(-1) === "migrate"));
  assert(!setup.calls.some((args) => args.at(-1) === "backend"));
});

test("health failure leaves candidate and backup for operator recovery", async (t) => {
  const setup = releaseFixture(t);
  await assert.rejects(
    deployRelease(candidate, image, {
      ...setup,
      checkHealth: async () => {
        throw new Error("unhealthy");
      },
    }),
  );
  assert.deepEqual(readFileSync(join(setup.appDir, ".env.production")), candidate);
  assert.deepEqual(readFileSync(join(setup.appDir, ".env.production.previous")), oldConfig);
});

test("health requires the requested image and three consecutive successful responses", async () => {
  let probes = 0;
  await checkBackendHealth(image, {
    compose: async () => "b".repeat(64),
    docker: async (args) =>
      args[0] === "image"
        ? "sha256:expected"
        : JSON.stringify([{ Image: "sha256:expected", State: { Running: true }, RestartCount: 0 }]),
    probe: async () => {
      probes++;
      return true;
    },
    sleep: async () => {},
  });
  assert.equal(probes, 3);
});

test("rejects a stale backend even when an HTTP server would return success", async () => {
  await assert.rejects(
    checkBackendHealth(image, {
      compose: async () => "b".repeat(64),
      docker: async (args) =>
        args[0] === "image" ? "sha256:expected" : JSON.stringify([{ Image: "sha256:old" }]),
    }),
    DeploymentError,
  );
});

test("Docker uses the fixed local context, project, Compose file, and sanitized environment", async () => {
  let captured;
  await composeCommand(image, ["config", "--quiet"], {
    execute: async (...args) => {
      captured = args;
      return { stdout: "" };
    },
  });
  const [executable, args, options] = captured;
  assert.equal(executable, "/usr/bin/docker");
  assert.deepEqual(args.slice(0, 5), ["--context", "default", "compose", "--project-name", "calibrate"]);
  assert.equal(args[args.indexOf("--env-file") + 1], "/dev/null");
  assert.equal(args[args.indexOf("--file") + 1], "/srv/calibrate/compose.yaml");
  assert.deepEqual(Object.keys(options.env).sort(), ["CALIBRATE_IMAGE", "HOME", "LC_ALL", "PATH"]);
  assert.equal(options.env.CALIBRATE_IMAGE, image);
  assert.equal(options.shell, undefined);
});

test("rejects command arguments before doing privileged work", async () => {
  const args = process.argv;
  process.argv = ["node", "deploy-calibrate", "unapproved-argument"];
  try {
    await assert.rejects(main(), DeploymentError);
  } finally {
    process.argv = args;
  }
});
