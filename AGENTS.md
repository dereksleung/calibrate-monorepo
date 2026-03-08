# AGENTS.md

## Scope
Instructions for working in this repository.

## Required Context
- For architecture/layering questions or cross-layer changes, read `docs/ai/architecture.md` first.
- Treat `docs/ai/architecture.md` as the source of truth for boundaries and dependency direction.

## Skill Routing
- Use `$test-agent` for any request involving tests, coverage, regressions, edge cases, or failing test diagnosis.
- Load and follow `.codex/skills/test-agent/SKILL.md` for those tasks.
- If the skill is unavailable, continue with best-effort and state that clearly.

## Project Commands
- Dev server: `npm run dev`
- Tests: `npm test`
- Type-aware check: `npm run typecheck`
- Lint: `npm run lint`
- Lint fix: `npm run lint:fix`
- Format: `npm run fmt`
- Format check: `npm run fmt:check`
- Build: `npm run build`
- Migrations: `npm run kysely migrate:latest`

## Architecture Guardrails
- Keep clean-architecture boundaries:
- `domain` must not depend on anything else, such as `infrastructure`, `presentation`, `application`.
- `application` depends on domain contracts/ports, not framework details.
- `presentation` maps HTTP <-> application DTOs/services.
- `infrastructure` implements ports (DB, hashing, etc.).

## Testing Policy
- Add/update tests in `src/**/__tests__/`, and factories in `test/`.
- Cover happy path, error path, and edge cases.
- Never remove or disable a failing test to make checks pass unless user explicitly authorizes it.

## Lint Policy
- `@typescript-eslint/no-explicit-any` is intentionally relaxed for:
- test files (`*.test.*`, `*.spec.*`, `__tests__`, `test/`)
- migration files (`src/infrastructure/persistence/migrations/**`)
- Keep strict typing elsewhere.

## Dependency Policy
- Never install or upgrade dependencies without explicit user confirmation.
- Before install/upgrade, show exact command(s) and wait for approval.

## Change Safety
- Keep edits focused to requested scope.
- Do not run destructive git/file commands without explicit approval.
- If unexpected unrelated changes are detected, stop and ask.