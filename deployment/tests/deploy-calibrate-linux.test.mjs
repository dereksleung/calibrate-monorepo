import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { acquireDeploymentLock, DeploymentError, readUpload } from "../deploy-calibrate.mjs";

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "deploy-linux-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("flock remains held by the parent after the locking utility exits", (t) => {
  const directory = fixture(t);
  const release = acquireDeploymentLock(directory);
  try {
    assert.throws(() => acquireDeploymentLock(directory), DeploymentError);
  } finally {
    release();
  }
  const releaseAgain = acquireDeploymentLock(directory);
  releaseAgain();
});

test("rejects FIFO uploads without waiting for a writer", (t) => {
  const directory = fixture(t);
  execFileSync("/usr/bin/mkfifo", [join(directory, "fifo")]);
  assert.throws(() => readUpload(directory, "fifo", process.getuid(), 100), DeploymentError);
});

test("extensionless installed launcher clears NODE_OPTIONS before Node starts", (t) => {
  const executable = join(fixture(t), "deploy-calibrate");
  const source = readFileSync(new URL("../deploy-calibrate.mjs", import.meta.url), "utf8").replace(
    /^#![^\n]+/,
    `#!/usr/bin/env -S -i ${process.execPath}`,
  );
  writeFileSync(executable, source, {
    mode: 0o755,
  });
  const result = spawnSync(executable, [], {
    env: { PATH: "/untrusted", NODE_OPTIONS: "--import=/untrusted/module.mjs", NODE_PATH: "/untrusted" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /deploy-calibrate:/);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|\/untrusted/);
});
