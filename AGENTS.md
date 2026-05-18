# AGENTS.md

## Scope

Instructions for working in this repository.

## Required Context

- For backend architecture/layering questions or backend cross-layer changes, read the backend ADRs under `apps/backend/docs/adr/` first.
- For other apps or projects, first look for project-local architecture docs under `apps/<project>/docs/` or the relevant project folder.
- Treat project-local architecture docs as the source of truth for that project's boundaries and dependency direction.

### Issue tracker

Issues, PRDs, and grouped implementation plans are tracked as local markdown files under `docs/tasks/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Matt Pocock skills use the default status names, scoped only to Matt Pocock skills as identified by each skill's `skills.md` file. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a multi-context Nx layout with ADRs stored under each project, such as `apps/backend/docs/adr/`. See `docs/agents/domain.md`.

## Skill Routing

- Use `$test-agent` for any request involving tests, coverage, regressions, edge cases, or failing test diagnosis.
- Load and follow `.codex/skills/test-agent/SKILL.md` for those tasks.
- If the skill is unavailable, continue with best-effort and state that clearly.

## Project Commands

- Dev server: `npx nx run <project_name>:dev`
- Tests: `npx nx run <project_name>:test`
- Type-aware check: `npx nx run <project_name>:typecheck`
- Lint: `npx nx run <project_name>:lint`
- Lint fix: `npx nx run <project_name>:lint:fix`
- Format: `npx nx run <project_name>:fmt`
- Format check: `npx nx run <project_name>:fmt:check`
- Build: `npx nx run <project_name>:build`
- Database Migrations: `npm run kysely migrate:latest`

## Testing Policy

- Add/update tests under the relevant project root, such as `apps/<project>/src/**/__tests__/`.
- Put project-specific test factories under that same project, such as `apps/<project>/test/`.
- Cover happy path, error path, and edge cases.
- Never remove or disable a failing test to make checks pass unless user explicitly authorizes it.

## Lint Policy

- `@typescript-eslint/no-explicit-any` is intentionally relaxed for:
  - test files (`*.test.*`, `*.spec.*`, `__tests__`, `apps/<project>/test/`)
  - migration files under the relevant app, such as `apps/backend/src/infrastructure/persistence/migrations/**`
- Keep strict typing elsewhere.

## Dependency Policy

- Never install or upgrade dependencies without explicit user confirmation.
- Before install/upgrade, show exact command(s) and wait for approval.

## Change Safety

- Keep edits focused to requested scope.
- Do not run destructive git/file commands without explicit approval.
- If unexpected unrelated changes are detected, stop and ask.
- Never store secrets, keys, or sensitive info in version control.


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->
