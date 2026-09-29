# Developing locally

## Common

1. Run `npm ci` in the project root.

Evaluators should follow [Run local demo](#run-local-demo) instead of the worktree and Dotenvx setup below.

## Git worktrees (shared Postgres)

Several linked git worktrees on one machine can share the existing Compose Postgres on `127.0.0.1:5433`. Each checkout gets its own database name, sticky frontend/backend ports, and matching API/CORS/WebAuthn URLs.

From the primary or a linked worktree:

```bash
npx nx run workspace:worktree-setup
```

Setup is idempotent. It will:

- copy `.env.keys` from the primary checkout when this worktree does not have it yet
- start the shared Postgres container only when `127.0.0.1:5433` is not already accepting connections (`COMPOSE_PROJECT_NAME=calibrate-shared`)
- create and migrate this worktree's database
- write gitignored `.worktree-dev.json` with the chosen ports and origins
- print copy-paste `backend:dev` and `web:dev` commands with the required env overrides

If no dotenvx key is available in this worktree, the primary checkout, or
`DOTENV_PRIVATE_KEY`, setup stops without provisioning anything. Setup does not
start Vite or Express; run the printed commands in separate terminals. Host
processes always talk to Postgres at `DB_HOST=127.0.0.1` and `DB_PORT=5433`.

The selected adjacent frontend/backend port pair is claimed in
`~/.calibrate/worktree-ports` by worktree path and reused when it is still
available. Teardown intentionally leaves that claim in place.

When you are done with a linked worktree database:

```bash
npx nx run workspace:worktree-teardown -- --database calibrate_wt_<slug>_<hash>
```

Teardown drops only this linked worktree's `calibrate_wt_*` database, deletes
this worktree's `.worktree-dev.json`, and leaves the shared Postgres container
running. It refuses the primary `.env` database, `postgres`, `template0`,
`template1`, and databases belonging to another worktree. Do not run `docker
compose down` for worktree cleanup.

The primary checkout keeps the `DB_NAME` from `.env`. Linked worktrees use `calibrate_wt_<slug>_<hash>` so same-named folders on different paths cannot collide.

## Backend

### Run locally

Use [Git worktree setup](#git-worktrees-shared-postgres). It starts only the
shared Postgres service, creates and migrates the selected database, and prints
the host `backend:dev` command. The Compose `backend` service is not part of
this worktree workflow.

### Seeding the Foundation Foods Demo catalog

After a local database is configured and migrated, run the seed target with the
same database environment as the backend. For a linked worktree, reuse the
`DB_NAME`, `DB_HOST`, and `DB_PORT` overrides printed by worktree setup:

```bash
npx nx run backend:seed-demo-catalog
```

The seed reads the checked-in Foundation Foods archive and manifest in
[`apps/backend/data/foundation-foods/`](apps/backend/data/foundation-foods/),
validates the pinned release identity, archive filename, SHA-256 checksum, and
expected mapping totals, then upserts records in bounded 250-row batches inside
one transaction. Reruns are idempotent. Record-local mapping failures are
skipped and included in the gitignored `.demo/catalog-seed-report.json` report.
The [source module](apps/backend/src/infrastructure/demo-catalog/foundation-foods-source.ts)
pins the release identity, while the
[manifest](apps/backend/data/foundation-foods/manifest.json) records the
checksum and expected summary.

### Initial dotenv configuration

1. Add a `.env` file to the project root. Set the following environment variables in it as strings, to the correct values. `DB_NAME` is the primary checkout database; shared local Postgres listens on `127.0.0.1:5433`.

```
DB_NAME="<primary_checkout_database>"
DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_USER="postgres"
DB_PASSWORD="<local_postgres_password>"
JWT_KEY_ID="local-dev"
JWT_ACCESS_TOKEN_TTL_SECONDS="900"
JWT_ISSUER="http://localhost:3001/"
JWT_AUDIENCE="http://localhost:3001/api"
API_BASE_URL="http://localhost:3001/"
OTP_HMAC_KEY="<base64url_encoded_random_key_of_at_least_32_bytes>"
OTP_HMAC_CURRENT_KEY_VERSION="1"
EMAIL_REQUEST_IP_HMAC_KEY="<independent_hexadecimal_random_key_of_at_least_32_bytes>"
EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT="1000"
TRUST_PROXY_HOPS="0"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"
WEBAUTHN_RP_NAME="Calibrate"
EMAIL_SERVICE_CREDENTIAL="<brevo_api_key>"
```

`TRUST_PROXY_HOPS` must match the number of trusted reverse-proxy hops in front
of the backend (`0` for direct local development). It controls which address
Express exposes as the requesting IP; it does not authenticate the client.
`WEBAUTHN_ORIGIN` must match the frontend origin used for passkey ceremonies
(`http://localhost:3000` is the primary checkout default). Worktree setup
overrides the frontend port, `VITE_API_BASE_URL`, `CORS_ORIGIN`, and
`WEBAUTHN_ORIGIN` for the selected worktree pair. Use independently generated
values for `OTP_HMAC_KEY` and `EMAIL_REQUEST_IP_HMAC_KEY`.

2. Generate an Ed25519 private key .pem file using `openssl genpkey -algorithm ED25519 -out jwt-ed25519-private.pem`.

3. Copy the .pem file contents to the .env file like JWT_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n(the_private_key)\n-----END PRIVATE KEY-----". It will be encrypted using dotenvx, which is a project dependency.

4. Run `npm ci` in the project root.

5. Run `npx dotenvx encrypt`. It should generate a .env.keys file with a private key, and encrypt the values in .env.
   Dotenvx docs [here](https://dotenvx.com/docs/learn/encrypting/introduction)

6. Run `npx nx run workspace:worktree-setup` to provision Postgres, create the worktree database, run migrations, and print the dev commands.

7. Run the printed `backend:dev` and `web:dev` commands in separate terminals.

8. Other commands can be run like `npx nx run (project_name):(command_name) (args)`. Project names are found in `apps/app-folder/package.json`'s `name` field, the available command names comes from the `scripts` field.

### Testing signup locally without Brevo

When the web frontend is running on the HTTP loopback origin configured by the
backend's `WEBAUTHN_ORIGIN` (the frontend origin printed by worktree setup),
the signup page shows a local-development-only section with an
**Authorize create passkey** button. Use it to create a disposable
`@example.test` account and continue directly to the existing passkey setup
page. This bypass is denied in production and does not create a deliverable
recovery email, so it is intended only for evaluating the local repository.
Nx documentation [here](https://nx.dev/docs/getting-started/tutorials/running-tasks#running-a-single-task)

### Inspecting authenticated pages locally without a passkey

For a quick manual check of the dashboard or other protected pages, provision
the current worktree first:

```bash
npx nx run workspace:worktree-setup
```

Run the printed backend and frontend commands in separate terminals, then open
the printed frontend URL at `/calibrate-monorepo/signup-login` in the agent
browser and click **Start local test session**. The server creates the
disposable local fixture session and the browser keeps the normal access and
refresh cookies; no passkey is created or stored. The button is available only
from the local loopback development UI, and the backend remains the
authoritative boundary.

Use **Authorize create passkey** when the task is specifically about passkey
registration or the real WebAuthn flow. The local test session does not satisfy
recent passkey re-authentication required by sensitive operations. See
[ADR-0004](apps/backend/docs/adr/0004-loopback-only-local-test-session.md) for
the security boundary and rationale.

### Building the backend Docker image

The backend Dockerfile is in `apps/backend`, but it must be built with the repository root as the Docker build context because it copies root workspace files and the shared `packages/api-contracts` package.

Run this from the repository root:

```bash
npx nx run backend:docker-build
```

Equivalent raw Docker command:

```bash
docker build -f apps/backend/Dockerfile -t dereksleung407/calibrate:latest .
```

Do not use `apps/backend` as the build context. Docker cannot copy files outside the context, so `docker build -f apps/backend/Dockerfile apps/backend` will fail when the Dockerfile tries to copy root files such as `package.json` or sibling workspace files such as `packages/api-contracts/package.json`.

## Frontend

### Running Frontend Locally

Use [Git worktree setup](#git-worktrees-shared-postgres), then run the printed
`web:dev` command. The frontend URL is the `frontendUrl` in
`.worktree-dev.json` and may differ between worktrees.
