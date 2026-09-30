# 03: Scope distributed into workflow slices

**Blocked by:** None.

**Status:** superseded

No implementation checkpoint remains in this ticket. Models, builders, and pure endpoint response mappers now arrive with the workflow that first needs them:

- Day Log, nested Meal/Food Entry, `DatedDayLogCacheResult`, sync result, and shared builders: [04](./04-move-day-log-sync-and-slot-composition-to-core.md).
- Save acknowledgement and command models/builders: [05](./05-move-save-food-entry-reconciliation-workflow-to-core.md).
- Updated weight and acknowledgement models/builders: [06](./06-move-update-weight-reconciliation-workflow-to-core.md).
- Read endpoint mappers and snapshot semantics: [07](./07-migrate-logs-to-day-log-read-workflows.md).
- Food-search result models/builders and mapper: [08](./08-migrate-food-search-to-domain-workflow.md).
- Authentication models, builders, and mappers: [10](./10-migrate-session-to-authenticated-user-context.md) through [14](./14-migrate-local-development-passkey-enrollment-workflow.md).

Shared models may gain fields in later tickets, but each ticket must finish with its own request, response mapper, workflow, tests, and public domain output working together. See [ADR-0007](../../../adr/0007-frontend-core-package-and-workflow-boundaries.md) and the [PRD](../PRD.md).
