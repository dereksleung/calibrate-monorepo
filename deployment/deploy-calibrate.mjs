#!/usr/bin/env -S -i /home/derek/.asdf/installs/nodejs/26.4.0/bin/node
import { execFile, execFileSync } from "node:child_process";
import {
  constants,
  openSync,
  closeSync,
  fstatSync,
  readSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { get } from "node:http";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const APP_DIR = "/srv/calibrate";
const INCOMING_DIR = "/home/deploy/incoming";
const NODE_BINARY = "/home/derek/.asdf/installs/nodejs/26.4.0/bin/node";
const IMAGE_REPOSITORY = "dereksleung407/calibrate";
const ENV = { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/root", LC_ALL: "C" };
const execFileAsync = promisify(execFile);
let cancellation;

export class DeploymentError extends Error {}

export function readUpload(directory, name, expectedUid, limit) {
  let fd;
  try {
    if (!lstatSync(directory).isDirectory())
      throw new DeploymentError("Upload directory must be a directory, not a symlink");
    fd = openSync(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const metadata = fstatSync(fd);
    if (!metadata.isFile() || metadata.uid !== expectedUid)
      throw new DeploymentError("Upload must be a regular file owned by deploy");
    if (metadata.size > limit) throw new DeploymentError("Upload exceeds its size limit");
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (!length || length > limit) throw new DeploymentError("Upload is empty or exceeds its size limit");
    return buffer.subarray(0, length);
  } catch (error) {
    if (error instanceof DeploymentError) throw error;
    throw new DeploymentError("Cannot safely read staged upload");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function validateConfiguration(contents) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(contents);
  } catch {
    throw new DeploymentError("Configuration must be UTF-8");
  }
  if (source.includes("\0")) throw new DeploymentError("Configuration contains a NUL byte");
  const settings = new Set();
  const secrets = new Set([
    "DB_PASSWORD",
    "OTP_HMAC_KEY",
    "EMAIL_REQUEST_IP_HMAC_KEY",
    "JWT_PRIVATE_KEY_PEM",
    "EMAIL_SERVICE_CREDENTIAL",
    "FOODDATA_CENTRAL_API_KEY",
  ]);
  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)='([^'\r\n]*)'$/.exec(line);
    if (!assignment) throw new DeploymentError(`Invalid configuration literal at line ${index + 1}`);
    const [, name, value] = assignment;
    if (settings.has(name)) throw new DeploymentError(`Duplicate configuration setting at line ${index + 1}`);
    if (name.startsWith("DOTENV_PRIVATE_KEY") || name === "DOPPLER_TOKEN")
      throw new DeploymentError("Decryption credentials must not be uploaded");
    if (secrets.has(name) && value && !value.startsWith("encrypted:"))
      throw new DeploymentError(`Unencrypted secret at line ${index + 1}`);
    settings.add(name);
  }
  if (!settings.size) throw new DeploymentError("Configuration contains no settings");
}

export function validateImage(contents) {
  const image = contents.toString("utf8").trim();
  const digest = image.startsWith(`${IMAGE_REPOSITORY}@`) ? image.slice(IMAGE_REPOSITORY.length + 1) : image;
  if (/^(?:sha256:)?[0-9a-f]{64}$/.test(digest))
    return `${IMAGE_REPOSITORY}@${digest.startsWith("sha256:") ? digest : `sha256:${digest}`}`;

  const tag = image.startsWith(`${IMAGE_REPOSITORY}:`) ? image.slice(IMAGE_REPOSITORY.length + 1) : image;
  const numeric = "(?:0|[1-9][0-9]*)";
  const identifier = `(?:${numeric}|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)`;
  const semver = new RegExp(
    `^v?${numeric}\\.${numeric}\\.${numeric}(?:-${identifier}(?:\\.${identifier})*)?$`,
  );
  if (tag.length <= 128 && semver.test(tag)) return `${IMAGE_REPOSITORY}:${tag}`;
  throw new DeploymentError(
    "Image must be a registry digest or exact semver tag in dereksleung407/calibrate",
  );
}

export async function resolveImage(image, { docker = dockerOutput } = {}) {
  const reference = validateImage(Buffer.from(image));
  if (reference.startsWith(`${IMAGE_REPOSITORY}@`)) return reference;
  let output;
  try {
    output = await docker(["pull", reference], { timeout: 300_000 });
  } catch {
    throw new DeploymentError(
      "Cannot resolve selected image tag; check that it exists and registry access is configured",
    );
  }
  // Docker pull reports the registry manifest/index digest, not the local image ID.
  // Use that exact digest for every later operation, even if the tag moves.
  const digests = [...output.matchAll(/^Digest: (sha256:[0-9a-f]{64})\r?$/gm)];
  if (digests.length !== 1)
    throw new DeploymentError("Docker pull did not return one unambiguous registry digest");
  return `${IMAGE_REPOSITORY}@${digests[0][1]}`;
}

function atomicWrite(appDir, destination, contents) {
  const temporary = mkdtempSync(join(appDir, ".deploy-"));
  try {
    const file = join(temporary, "value");
    writeFileSync(file, contents, { flag: "wx", mode: 0o600, flush: true });
    // Replace the inode atomically; existing container bind mounts retain their
    // current file until their containers are explicitly recreated.
    renameSync(file, destination);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function run(command, args, { appDir = APP_DIR, timeout = 300_000, uncancellable = false } = {}) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: appDir,
    env: ENV,
    timeout,
    killSignal: "SIGKILL",
    maxBuffer: 1024 * 1024,
    signal: uncancellable ? undefined : cancellation?.signal,
  });
  return stdout.trim();
}

export async function composeCommand(
  image,
  args,
  { appDir = APP_DIR, execute = execFileAsync, ...options } = {},
) {
  const { stdout } = await execute(
    "/usr/bin/docker",
    [
      "--context",
      "default",
      "compose",
      "--project-name",
      "calibrate",
      "--project-directory",
      appDir,
      "--env-file",
      "/dev/null",
      "--file",
      join(appDir, "compose.yaml"),
      ...args,
    ],
    {
      cwd: appDir,
      env: { ...ENV, CALIBRATE_IMAGE: image },
      timeout: options.timeout ?? 300_000,
      killSignal: "SIGKILL",
      maxBuffer: 1024 * 1024,
      signal: options.uncancellable ? undefined : cancellation?.signal,
    },
  );
  return stdout.trim();
}

const dockerOutput = (args, options) =>
  run("/usr/bin/docker", ["--context", "default", ...args], { timeout: 15_000, ...options });

function probeHealth() {
  return new Promise((resolveProbe) => {
    // Core HTTP neither follows redirects nor uses proxy environment variables.
    const request = get(
      "http://127.0.0.1:3001/health",
      { signal: AbortSignal.timeout(2_000) },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 4096) {
            response.destroy();
            resolveProbe(false);
          }
        });
        response.on("error", () => resolveProbe(false));
        response.on("end", () => {
          try {
            resolveProbe(response.statusCode === 200 && JSON.parse(body).status === "OK");
          } catch {
            resolveProbe(false);
          }
        });
      },
    );
    request.on("error", () => resolveProbe(false));
  });
}

export async function checkBackendHealth(image, options = {}) {
  const dc = options.compose ?? composeCommand;
  const docker = options.docker ?? dockerOutput;
  const probe = options.probe ?? probeHealth;
  const pause = options.sleep ?? sleep;
  const expected = await docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  const container = await dc(image, ["ps", "--quiet", "backend"], { timeout: 15_000 });
  if (!/^[0-9a-f]{64}$/.test(container)) throw new DeploymentError("Expected one backend container");
  const deadline = Date.now() + 90_000;
  let consecutive = 0;
  while (Date.now() < deadline) {
    cancellation?.signal.throwIfAborted();
    const [state] = JSON.parse(await docker(["inspect", container]));
    if (state.Image !== expected) throw new DeploymentError("Backend is not running the requested image");
    if (!state.State.Running || state.RestartCount !== 0)
      throw new DeploymentError("Backend exited or restarted during deployment");
    consecutive = (await probe()) ? consecutive + 1 : 0;
    if (consecutive === 3) return;
    await pause(2_000);
  }
  throw new DeploymentError("Backend HTTP health check timed out");
}

export async function deployRelease(
  configuration,
  image,
  {
    appDir = APP_DIR,
    compose = composeCommand,
    checkHealth = checkBackendHealth,
    docker = dockerOutput,
    log = console.info,
  } = {},
) {
  image = await resolveImage(image, { docker });
  log(`Deploying ${image}`);
  const dc = (args, options) => compose(image, args, { appDir, ...options });
  log("Validating Compose and pulling the release image");
  await dc(["config", "--quiet"]);
  await dc(["pull", "backend", "migrate"]);
  await dc(["up", "-d", "--no-recreate", "--wait", "--wait-timeout", "60", "postgres"], { timeout: 90_000 });
  const current = join(appDir, ".env.production");
  const previous = readFileSync(current);
  atomicWrite(appDir, join(appDir, ".env.production.previous"), previous);
  atomicWrite(appDir, current, configuration);
  log("Applying migrations with the staged production configuration");
  try {
    await dc(
      ["up", "--no-deps", "--force-recreate", "--pull", "never", "--exit-code-from", "migrate", "migrate"],
      { timeout: 600_000 },
    );
  } catch (error) {
    try {
      await dc(["stop", "--timeout", "30", "migrate"], { timeout: 45_000, uncancellable: true });
    } finally {
      atomicWrite(appDir, current, previous);
    }
    log("Migration step failed; previous configuration restored; backend was not recreated");
    throw error;
  }
  const releaseFile = join(appDir, "release.env");
  if (existsSync(releaseFile))
    atomicWrite(appDir, join(appDir, "release.env.previous"), readFileSync(releaseFile));
  atomicWrite(appDir, releaseFile, `CALIBRATE_IMAGE=${image}\n`);
  log("Recreating backend and checking its HTTP health");
  // The script already verified migration success. Avoid running dependencies
  // again, and force recreation even when only the config file changed.
  await dc(["up", "-d", "--no-deps", "--force-recreate", "--pull", "never", "backend"], { timeout: 90_000 });
  await checkHealth(image);
  log("Calibrate deployment succeeded");
}

export function requireProtectedPath(path, { directory = false, privateFile = false, owners = [0] } = {}) {
  const metadata = lstatSync(path);
  if (
    !(directory ? metadata.isDirectory() : metadata.isFile()) ||
    !owners.includes(metadata.uid) ||
    metadata.mode & 0o022
  ) {
    throw new DeploymentError(
      "Deployment paths must have approved ownership and no group or other write access",
    );
  }
  if (privateFile && metadata.mode & 0o077)
    throw new DeploymentError("Deployment credentials must be accessible only by root");
}

function trustedParents(path, owners = [0]) {
  let parent = dirname(path);
  while (true) {
    requireProtectedPath(parent, { directory: true, owners });
    if (parent === "/") break;
    parent = dirname(parent);
  }
}

export function acquireDeploymentLock(appDir = APP_DIR) {
  const lock = openSync(
    join(appDir, ".deploy.lock"),
    constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    // flock locks the shared open-file description. Keeping the parent fd open
    // holds the lock after the utility exits; a crash closes it automatically.
    execFileSync("/usr/bin/flock", ["--nonblock", "3"], {
      env: ENV,
      stdio: ["ignore", "pipe", "pipe", lock],
    });
    return () => closeSync(lock);
  } catch {
    closeSync(lock);
    throw new DeploymentError("Cannot acquire deployment lock; another deployment may be running");
  }
}

export async function main() {
  if (process.geteuid() !== 0 || process.argv.length !== 2)
    throw new DeploymentError("Run this installed script through sudo with no arguments");
  if (process.versions.node !== "26.4.0") throw new DeploymentError("This script requires Node.js 26.4.0");
  if (process.execPath !== NODE_BINARY)
    throw new DeploymentError("Use the configured asdf Node executable on the Droplet");
  process.umask(0o077);
  const uid = await run("/usr/bin/id", ["-u", "deploy"]);
  const administratorUid = await run("/usr/bin/id", ["-u", "derek"]);
  if (!/^\d+$/.test(uid) || !/^\d+$/.test(administratorUid) || uid === administratorUid)
    throw new DeploymentError("The deploy and administrator accounts must be distinct");
  const runtimeOwners = [0, Number(administratorUid)];
  trustedParents(NODE_BINARY, runtimeOwners);
  requireProtectedPath(NODE_BINARY, { owners: runtimeOwners });
  for (const path of ["/usr/local/sbin/deploy-calibrate.mjs", join(APP_DIR, "compose.yaml")]) {
    trustedParents(path);
    requireProtectedPath(path);
  }
  for (const path of [
    join(APP_DIR, ".env.production"),
    "/etc/calibrate/doppler-token",
    "/etc/calibrate/postgres-password",
  ]) {
    trustedParents(path);
    requireProtectedPath(path, { privateFile: true });
  }
  for (const name of [".env.production.previous", "release.env", "release.env.previous", ".deploy.lock"]) {
    try {
      requireProtectedPath(join(APP_DIR, name), { privateFile: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  cancellation = new AbortController();
  for (const signal of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(signal, () => cancellation.abort());
  const releaseLock = acquireDeploymentLock();
  try {
    const configuration = readUpload(INCOMING_DIR, ".env.production", Number(uid), 128 * 1024);
    const image = validateImage(readUpload(INCOMING_DIR, "image.txt", Number(uid), 256));
    validateConfiguration(configuration);
    await deployRelease(configuration, image);
  } finally {
    releaseLock();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    // Never emit subprocess output, uploaded values, or raw exception messages.
    console.error(
      `deploy-calibrate: ${error instanceof DeploymentError ? error.message : "deployment failed; administrator inspection required"}`,
    );
    process.exitCode = 1;
  });
}
