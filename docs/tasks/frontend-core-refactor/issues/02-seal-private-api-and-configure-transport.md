# 02: Scope distributed into workflow slices

**Blocked by:** None.

**Status:** superseded

No implementation checkpoint remains in this ticket. Moving every request into `api/**` before its model, mapper, and workflow would leave the package between architectures. The work is assigned to complete workflow slices instead:

- Sync and Day Log cache: [04](./04-move-day-log-sync-and-slot-composition-to-core.md).
- Save Food Entry: [05](./05-move-save-food-entry-reconciliation-workflow-to-core.md).
- Update Weight: [06](./06-move-update-weight-reconciliation-workflow-to-core.md).
- Day Log reads: [07](./07-migrate-logs-to-day-log-read-workflows.md).
- Food search: [08](./08-migrate-food-search-to-domain-workflow.md).
- Session, email verification, passkey authentication, passkey registration, and local-development auth: [10](./10-migrate-session-to-authenticated-user-context.md) through [14](./14-migrate-local-development-passkey-enrollment-workflow.md).

Ticket [01](./01-rename-package-and-establish-direct-imports.md) owns the initial explicit export allowlist needed for direct imports. Each workflow ticket extends that allowlist only for its approved public leaves and keeps its new `api/**` path private. Ticket [10](./10-migrate-session-to-authenticated-user-context.md) owns configurable transport credentials with the current `"include"` default. Ticket [15](./15-prove-the-contract-firewall-and-remove-transitional-adapters.md) audits the completed boundary.

The architecture and acceptance criteria remain in [ADR-0007](../../../adr/0007-frontend-core-package-and-workflow-boundaries.md) and the [PRD](../PRD.md).
