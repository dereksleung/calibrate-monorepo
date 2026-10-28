import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

function runWorkflow(t, image, failUpload = false) {
  const directory = mkdtempSync(join(tmpdir(), "manual-deploy-workflow-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bin = join(directory, "bin");
  const incoming = join(directory, "incoming");
  mkdirSync(bin);
  mkdirSync(incoming);
  writeFileSync(join(directory, ".env.production"), "DB_PASSWORD='encrypted:synthetic'\n");
  writeFileSync(join(incoming, ".env.production"), "previous configuration");
  writeFileSync(join(incoming, "image.txt"), "previous image");
  const log = join(directory, "events.jsonl");
  const transport = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const name = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_LOG, JSON.stringify({ name, args }) + '\\n');
if (name === 'scp') {
  const source = args.at(-2);
  if (process.env.TEST_FAIL_UPLOAD === '1' && args.at(-1).endsWith('/image.txt.upload')) process.exit(1);
  const destination = args.at(-1).split(':')[1].replace('/home/deploy/incoming', process.env.TEST_INCOMING);
  fs.copyFileSync(source, destination);
} else if (name === 'ssh') {
  const command = args.at(-1).replaceAll('/home/deploy/incoming', process.env.TEST_INCOMING);
  const result = spawnSync('/bin/bash', ['-c', command], { env: process.env, stdio: 'inherit' });
  process.exit(result.status ?? 1);
} else if (name === 'sudo') {
  for (const file of ['.env.production', 'image.txt']) {
    if ((fs.statSync(path.join(process.env.TEST_INCOMING, file)).mode & 0o777) !== 0o600) process.exit(1);
  }
}
`;
  for (const name of ["ssh", "scp", "sudo"]) writeFileSync(join(bin, name), transport, { mode: 0o755 });
  const workflow = readFileSync(new URL("../github-actions/deploy-calibrate.yml", import.meta.url), "utf8");
  const block = workflow.match(/^        run: \|\n([\s\S]*)$/m);
  assert(block, "workflow must have an inline deployment script");
  const script = block[1]
    .split("\n")
    .map((line) => line.slice(10))
    .join("\n");
  const result = spawnSync("/bin/bash", ["-c", script], {
    cwd: directory,
    env: {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin`,
      RUNNER_TEMP: directory,
      SSH_PRIVATE_KEY: "synthetic-private-key",
      SSH_KNOWN_HOSTS: "synthetic-host-key",
      DROPLET_HOST: "droplet.invalid",
      DEPLOY_IMAGE: image,
      TEST_LOG: log,
      TEST_INCOMING: incoming,
      TEST_FAIL_UPLOAD: failUpload ? "1" : "0",
      TEST_CANARY: join(directory, "unexpected-shell-execution"),
    },
    encoding: "utf8",
  });
  const events = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map(JSON.parse) : [];
  return { directory, incoming, events, result };
}

test("manual workflow publishes both protected uploads before invoking the fixed sudo command", (t) => {
  const { incoming, events, result } = runWorkflow(t, "v1.2.3");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(incoming, "image.txt"), "utf8"), "v1.2.3\n");
  assert.equal(
    readFileSync(join(incoming, ".env.production"), "utf8"),
    "DB_PASSWORD='encrypted:synthetic'\n",
  );
  assert.deepEqual(
    events.map((event) => event.name),
    ["ssh", "scp", "scp", "ssh", "sudo"],
  );
  assert.deepEqual(events.at(-1).args, ["-n", "/usr/local/sbin/deploy-calibrate.mjs"]);
  for (const event of events.filter((event) => ["ssh", "scp"].includes(event.name))) {
    assert(event.args.includes("StrictHostKeyChecking=yes"));
    assert(event.args.includes("BatchMode=yes"));
  }
});

test("manual workflow preserves user image input as data without shell expansion", (t) => {
  const input = '1.2.3; touch "$TEST_CANARY"; $(touch "$TEST_CANARY")';
  const { directory, incoming, result } = runWorkflow(t, input);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(incoming, "image.txt"), "utf8"), `${input}\n`);
  assert(!existsSync(join(directory, "unexpected-shell-execution")));
});

test("failed image upload prevents publication and deployment", (t) => {
  const { incoming, events, result } = runWorkflow(t, "1.2.3", true);
  assert.notEqual(result.status, 0);
  assert(!events.some((event) => event.name === "sudo"));
  assert.equal(readFileSync(join(incoming, ".env.production"), "utf8"), "previous configuration");
  assert.equal(readFileSync(join(incoming, "image.txt"), "utf8"), "previous image");
});

test("empty image input fails before SSH", (t) => {
  const { events, result } = runWorkflow(t, "");
  assert.notEqual(result.status, 0);
  assert.deepEqual(events, []);
});
