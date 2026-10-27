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
and `DB_PORT='5432'`, with credentials matching the PostgreSQL service. The host's
published port `5433` is not used between containers. Compose initializes a
database named `postgres`; `DB_NAME` must match it, or the chosen database must
already have been provisioned separately. Changing `POSTGRES_DB` does not create
a new database in an existing PostgreSQL volume.

The existing token and configuration mounts are shared by both services. The
migration job uses the same complete validated production configuration as the
backend, including its existing required non-database settings.

## First startup

From the repository root, after provisioning the existing configuration/secret
files and publishing an image containing these changes:

```sh
docker compose -f deployment/compose.yaml up -d
```

Compose waits for PostgreSQL's healthcheck, runs `migrate`, and starts the backend
only after the job exits successfully. Kysely creates its bookkeeping tables in
an empty database and applies all pending migrations. Its history lives in the
same PostgreSQL volume as application data.

## Each release

Run these commands in a shell that stops on failure. Keep `CALIBRATE_IMAGE` set
to the same release reference throughout:

```sh
set -e
docker compose -f deployment/compose.yaml pull backend migrate
docker compose -f deployment/compose.yaml up -d --wait postgres
docker compose -f deployment/compose.yaml up --no-deps --force-recreate --exit-code-from migrate migrate
docker compose -f deployment/compose.yaml up -d backend caddy
```

The explicit recreation runs this release's migration job even if an earlier job
completed successfully. `--no-deps` keeps the foreground job from stopping
PostgreSQL when the job exits. If migrations fail, the final startup command is
not reached; inspect `docker compose -f deployment/compose.yaml logs migrate`.
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
