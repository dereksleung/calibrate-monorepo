---
description:
alwaysApply: false
---

## Local demo runtime

- Explicit opt-in: `CALIBRATE_DEMO=1` via `npx nx run backend:demo` (`apps/backend/src/demo-app.ts`).
- Reads generated `.local.env` from `@calibrate/local-runtime-config`; never Dotenvx or `.env.keys`.
- Rationale and boundaries: `docs/adr/0004-self-contained-local-demo-mode.md`.

## Backend Architecture Guardrails

- Before backend architecture, layering, or cross-layer changes, read the ADRs under `apps/backend/docs/adr/`.
- Keep clean-architecture boundaries:
- `domain` must not depend on anything else, such as `infrastructure`, `presentation`, `application`.
- `application` depends on domain contracts/ports, not framework details.
- `presentation` maps HTTP <-> application DTOs/services.
- `infrastructure` implements ports (DB, hashing, etc.).

## Test Suite Placement

- Use `*.test.ts` for fast backend tests run by `npx nx run backend:test`, such as domain entities, application services with test doubles, mappers, validators, and controller logic with mocked dependencies.
- Use `*.integration.test.ts` for slower backend tests run by `npx nx run backend:test:integration`, such as persistence adapters, real database behavior, middleware wired to framework objects, or multiple clean-architecture layers wired together locally.
- Use `*.e2e.test.ts` for end-to-end backend tests run by `npx nx run backend:test:e2e`, such as full HTTP flows through the app boundary.
- Keep test helpers and factories under `apps/backend/test/`, with integration-only helpers under `apps/backend/test/integration/` and e2e-only helpers under `apps/backend/test/e2e/` when the distinction matters.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
