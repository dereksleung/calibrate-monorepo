# ADR-0004: Use a self-contained local demo mode with pinned USDA data

## Status

Accepted

## Date

2026-08-28

## Last Updated

2026-09-12

## Context

The normal local setup depends on private Dotenvx configuration and a FoodData Central API key. That prevents an evaluator from running Calibrate from a fresh clone. A remote shared database would solve one setup step but would make the evaluator experience dependent on shared credentials, availability, and mutable shared state.

Demo setup and developer worktrees already share `postgres:18` and host port `127.0.0.1:5433`. Separate Compose project names cannot actually isolate them on that port. The remaining join is the Postgres role baked into the volume on first `docker compose up`.

## Decision

Provide an explicit, loopback-only local demo mode. It generates gitignored, local-only runtime configuration; starts PostgreSQL through Docker Compose project `calibrate-shared`; preserves its local `calibrate_demo` database across normal reruns; uses the existing local test-session path; does not send email, decrypt JWT/HMAC/email/FDC material from Dotenvx, or call FoodData Central at runtime.

Demo setup does not require Dotenvx or `.env.keys`. The shared cluster role prefers decryptable dotenvx `DB_USER` / `DB_PASSWORD` when the private key is already present, so a developer volume stays reachable. Otherwise it reads or generates `~/.calibrate/shared-postgres.env`. Dotenvx secrets are not copied into that file.

Worktree setup uses the same resolver. Without decryptable `DB_NAME`, even the primary checkout gets a `calibrate_wt_*` database so evaluators can sample worktrees. `demo-reset` drops and recreates only `calibrate_demo`; it does not run `docker compose down --volumes`.

The Demo catalog is seeded idempotently from a pinned, checksummed USDA Foundation Foods source archive committed to the repository. The catalog is reference data, not a database dump or user fixture. The seed scans Foundation portions and retains at most one named non-volume measure, one mass value, and one volume measure after normalizing them to the same Reference serving; foods without a valid source portion use 100 g. Dataset upgrades are deliberate reviewed changes. SR Legacy is deferred until a benchmark of its expanded JSON import establishes an acceptable local memory and setup-time budget.

## Consequences

- Clone-and-run requires Docker rather than a host PostgreSQL installation, plus the ordinary dependency installation.
- Demo, the primary checkout, and linked worktrees share one Postgres on `127.0.0.1:5433` and differ by database name.
- `demo-reset` is an explicit destructive command that recreates only the local demo database state.
- If an existing volume was initialized with the other kind of credentials, recreate it with `docker compose -p calibrate-shared down --volumes`. Tear down leftover `calibrate-demo-*` projects that still bind `5433`.
- Food search outside the Demo catalog returns an ordinary empty result in demo mode rather than requiring an API key.
- The configuration/key generator is shared by E2E and demo setup, but PostgreSQL catalog writing remains backend infrastructure. E2E keeps Testcontainers on ephemeral ports.
- A source-reported zero remains zero. An Unreported nutrient is represented as zero for the existing numeric catalog contract and is listed by food ID, name, and nutrient in the generated seed report.
- Archive/envelope failures abort setup before catalog writes; record-local mapping failures are reported and skipped so one anomalous source record does not discard the whole catalog.
- After all records have passed preflight, catalog upserts use bounded multi-row statements inside one outer database transaction.
