# SSH backend deployment

GitHub Actions uploads a release and invokes the root-owned
[deploy-calibrate.mjs](deploy-calibrate.mjs) on the Droplet. The script runs on
the host using `/home/derek/.asdf/installs/nodejs/26.4.0/bin/node`. Docker Compose
runs the backend, migrations, and PostgreSQL; the deployment script does not run
inside an image. No npm packages are required on the host.

## Host prerequisites and installation

Steps 1–3 of the deployment setup must already provide a separate `deploy`
account, its SSH key, and `/home/deploy/incoming/`. The account must not belong to
the Docker group and must not have another rule granting broader sudo access.
Docker and its Compose plugin, `/usr/bin/id`, `/usr/bin/env`, and `/usr/bin/flock`
must already be available on the Ubuntu Droplet.

The Node executable and every directory in its path must be owned by root or
the trusted administrator `derek`, without group or other write access. Check
this **before enabling sudo access**; the `deploy` account must never be able to
replace the interpreter that runs as root. The launcher uses the exact asdf
binary, without an asdf shim or login-shell initialization. Its shebang clears
the environment before Node starts, including `NODE_OPTIONS`.

Keep `/srv/calibrate`, its Compose file, and the installed script root-owned
without group or other write access. The existing `.env.production`, Doppler
token, and PostgreSQL password files must be regular root-owned files accessible
only by root. Existing Caddy assets and configuration remain in place.

As your administrator, after copying the reviewed deployment files to the
Droplet, install the script and the sudoers rule:

```sh
sudo install -o root -g root -m 0755 deployment/deploy-calibrate.mjs /usr/local/sbin/deploy-calibrate.mjs
sudo visudo -cf deployment/deploy-calibrate.sudoers
sudo install -o root -g root -m 0440 deployment/deploy-calibrate.sudoers /etc/sudoers.d/deploy-calibrate
sudo visudo -c
```

The [sudoers rule](deploy-calibrate.sudoers) lets the `deploy` account run that
installed script as root without a password and with no arguments. Install it
as `/etc/sudoers.d/deploy-calibrate`; the repository file alone does not grant
access. The Action needs this rule for `sudo -n` to work without broader sudo
permissions. The Action cannot supply arbitrary root commands, a Compose
file, Docker options, or a different image repository. Script and Compose updates
remain administrator operations.

## Upload contract

Upload these two regular files, owned by `deploy`, into `/home/deploy/incoming/`:

- `.env.production`: the encrypted production artifact, at most 128 KiB.
- `image.txt`: one full immutable reference such as
  `dereksleung407/calibrate@sha256:<64 lowercase hexadecimal characters>`.
  Use the digest returned by the image publishing step. Tags such as `latest`
  and other repositories are rejected.

Configure one GitHub Actions concurrency group for the whole production job,
including uploads, with `cancel-in-progress: false`. Finish both uploads before
invoking SSH; do not overwrite an upload while another workflow is deploying it.
The host lock additionally prevents simultaneous deployment executions.

The Action then runs:

```sh
ssh deploy@your-droplet 'sudo -n /usr/local/sbin/deploy-calibrate.mjs'
```

## What the script does

1. Checks ownership and permissions, locks deployments, and snapshots the uploads
   into memory without following file symlinks or reading special files.
2. Checks single-quoted assignment syntax, duplicate keys, and accidental
   plaintext secrets. Uploaded Doppler tokens and dotenvx private keys are
   rejected. Uploaded configuration is never sourced or printed.
3. Validates the fixed Compose file and pulls the approved digest for both
   `backend` and `migrate`. Commands use the local Docker context, project
   `calibrate`, `/srv/calibrate/compose.yaml`, and an explicit environment.
4. Waits for PostgreSQL, preserving an existing container with `--no-recreate`.
   Atomically replaces `.env.production`, keeping a root-only `.previous` copy.
5. Runs the migration job. Its existing startup bootstrap fetches the key from
   Doppler, decrypts the file, and validates the complete runtime configuration
   before accessing PostgreSQL. The host script does not duplicate that schema.
6. Records the digest in root-owned `/srv/calibrate/release.env`, recreates only
   the backend even if only the configuration changed, and checks the requested
   image is running without restarts. Requires three consecutive successful
   responses from `http://127.0.0.1:3001/health` before returning success.

The health endpoint currently checks HTTP liveness. Migrations exercise database
access, but this is not a readiness check for all business operations, external
services, Caddy, or public TLS.

## Failure behavior

The script exits nonzero on failure and never dumps raw subprocess output or
configuration values. An administrator can inspect the relevant Compose logs on
the host. A migration failure or timeout stops the migration container, restores
the previous configuration, and leaves the backend unrecreated. It does not
undo already committed database changes.

After backend recreation starts, failure leaves the candidate configuration and
image in place for administrator diagnosis. `.env.production.previous` retains
the prior encrypted configuration; `release.env.previous` retains prior image
metadata when a previous automated deployment recorded it. There is no automatic
application or schema rollback. Migrations must support the running application
or be scheduled for a maintenance window.

For later administrator Compose commands, explicitly select the recorded image:

```sh
sudo docker compose -p calibrate -f /srv/calibrate/compose.yaml --env-file /srv/calibrate/release.env ps
```

The script never runs `down`, deletes database volumes, updates Compose, or
recreates Caddy. It does not rotate the PostgreSQL cluster password: changing
`DB_PASSWORD` in an upload does not update an existing database role.

## Verification

Pure and deployment-sequence tests use Node's built-in runner:

```sh
node --test deployment/tests/deploy-calibrate.test.mjs
```

On Linux with Node 26.4.0 and `flock`, also run:

```sh
node --test deployment/tests/deploy-calibrate.test.mjs deployment/tests/deploy-calibrate-linux.test.mjs
```

These tests use temporary files and doubles for Docker. They do not deploy,
contact Doppler, or connect to the production database. A Docker container was
used locally only to verify the exact Node version and Linux locking behavior.
