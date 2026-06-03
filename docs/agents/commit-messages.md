# Commit Message Instructions

Use short, imperative commit messages that describe the user-visible or codebase-visible change.

## Format

```text
<type>(<scope>): <lowercased verb> <rest of short description>
```

Examples:

```text
feat(backend): add audit log persistence
fix(frontend): add Logs page React components
docs(repo): document commit message conventions
test(backend): cover log entry validation errors
```

## Subject Rules

- Use a recognized type from the list below.
- Use a scope that names the affected app, package, or concern.
- Start the subject with a lowercased imperative verb, such as `add`, `fix`, `update`, `remove`, `rename`, `wire`, `validate`, or `document`.
- Keep the subject concise, ideally 72 characters or fewer.
- Do not end the subject with a period.
- Prefer one logical change per commit.

## Common Types

- `feat`: adds a new feature or capability.
- `fix`: fixes a bug or incorrect behavior.
- `docs`: changes documentation only.
- `test`: adds or updates tests.
- `refactor`: changes code structure without changing behavior.
- `perf`: improves performance without changing behavior.
- `style`: changes formatting or code style only.
- `build`: changes build tooling, dependencies, packaging, or generated build configuration.
- `ci`: changes CI/CD configuration or automation.
- `chore`: handles maintenance that does not fit another type.
- `revert`: reverts a previous commit.

## Scope Guidance

Use the smallest meaningful scope. Good scopes in this repo include:

- `backend`
- `frontend`
- `repo`
- `docs`
- `ci`
- package or library names when a change is narrower than an app

## Body Guidance

Most commits only need a subject. Add a body when the reason, tradeoff, migration note, or follow-up risk is not obvious from the diff.

```text
feat(backend): add audit log persistence

Store audit log entries through the existing persistence boundary so later
read models can reuse the same transaction flow.
```
