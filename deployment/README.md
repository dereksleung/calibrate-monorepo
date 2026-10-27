# Backend database migrations

The backend and `migrate` services use the same image. The build includes
`dist/startup.mjs`, `dist/migrate.mjs`, shared chunks, and `dist/migrations/*.mjs`.
Keep the whole `dist` directory together. No Nx, TypeScript loader, or source
checkout is needed inside the production container.

Both entrypoints load the existing Doppler token and encrypted production
configuration before importing database consumers. The migration entrypoint
applies pending migrations, logs migration names/statuses without raw database
errors, closes the pool, and exits nonzero on failure. It does not start HTTP.

## Configuration

Set `CALIBRATE_IMAGE` to the release image reference before running Compose. Both
services inherit that exact reference; prefer a digest or immutable release tag.
The existing `dereksleung407/calibrate:latest` reference remains the default.

The encrypted `/srv/calibrate/.env.production` must contain `DB_HOST='postgres'`
and `DB_PORT='5432'`, with credentials matching the PostgreSQL service. PostgreSQL
has no host-port binding: both consumers connect over the Compose network. Use
`docker compose -p calibrate -f /srv/calibrate/compose.yaml exec postgres psql -U postgres -d postgres`
for a database shell. Compose initializes a database named `postgres`; `DB_NAME`
must match it, or the chosen database must already have been provisioned
separately. Changing `POSTGRES_DB` does not create a new database in an existing
PostgreSQL volume.

The existing token and configuration mounts are shared by both services. The
migration job uses the same complete validated production configuration as the
backend, including its existing required non-database settings.

## Existing Droplet preflight

Before running startup or release commands on a host with an existing deployment,
identify its Compose project and database volume:

```sh
docker compose ls
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}'
docker volume ls --filter label=com.docker.compose.volume=postgres_data
```

Reuse the existing deployment's Compose project name, for example by setting
`COMPOSE_PROJECT_NAME` to that name for every command. Compose otherwise derives
the project name from the Compose file's directory. Moving the file can therefore
select a new project and create a new empty database volume. A newly created
`derek_postgres_data` volume alongside an older deployment is a reason to check
which database is intended before running migrations or starting the backend.
Do not stop another container or delete a volume just to free a port.

The current Droplet deployment uses project `calibrate` and configuration
`/srv/calibrate/compose.yaml`. Install the updated `deployment/compose.yaml` at
that existing path before running the commands below. Preserve the adjacent
`conf/` and `site/` directories used by the relative Caddy mounts. Every command
specifies both the project and the absolute configuration path, so it can run
from any directory without selecting a second deployment. For another host,
adapt both values to that host's existing deployment.

## First startup

On the Droplet, after installing the updated Compose file, provisioning the
existing configuration/secret files, and publishing an image containing these
changes:

```sh
docker compose -p calibrate -f /srv/calibrate/compose.yaml up -d
```

Compose waits for PostgreSQL's healthcheck, runs `migrate`, and starts the backend
only after the job exits successfully. Kysely creates its bookkeeping tables in
an empty database and applies all pending migrations. Its history lives in the
same PostgreSQL volume as application data.

## Each release

Keep `CALIBRATE_IMAGE` set to the same release reference throughout. Run the
commands in a subshell so a failure stops the release without enabling `set -e`
in your interactive SSH shell:

```sh
(
  set -e
  docker compose -p calibrate -f /srv/calibrate/compose.yaml config --quiet
  docker compose -p calibrate -f /srv/calibrate/compose.yaml pull backend migrate
  docker compose -p calibrate -f /srv/calibrate/compose.yaml up -d --wait postgres
  docker compose -p calibrate -f /srv/calibrate/compose.yaml up --no-deps --force-recreate --exit-code-from migrate migrate
  docker compose -p calibrate -f /srv/calibrate/compose.yaml up -d backend caddy
)
```

The explicit recreation runs this release's migration job even if an earlier job
completed successfully. `--no-deps` keeps the foreground job from stopping
PostgreSQL when the job exits. If migrations fail, the final startup command is
not reached; inspect `docker compose -p calibrate -f /srv/calibrate/compose.yaml logs migrate`.
Correct the failure before retrying. Never mark failed migrations successful by
editing Kysely's history manually.

An existing backend can continue serving during the migration step, so release
migrations must remain compatible with the running version or require a planned
maintenance window. Reverting an application image does not undo schema changes.
Preserve the PostgreSQL volume across deployments; do not use `down -v`.

## Local verification

After building with `npx nx run backend:build`, exercise the compiled migrations
against a disposable PostgreSQL test container from the repository root:

```sh
CALIBRATE_TEST_MIGRATION_FOLDER="$PWD/apps/backend/dist/migrations" npx nx run backend:test:integration src/infrastructure/__tests__/migrate-database.integration.test.ts
```

The test checks every migration name against the source inventory and verifies a
second run preserves history. It does not use the production database or secrets.
