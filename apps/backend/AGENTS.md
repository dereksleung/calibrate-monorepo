## Architecture Guardrails

- Before backend architecture, layering, or cross-layer changes, read the ADRs under `apps/backend/docs/adr/`.
- Keep clean-architecture boundaries:
- `domain` must not depend on anything else, such as `infrastructure`, `presentation`, `application`.
- `application` depends on domain contracts/ports, not framework details.
- `presentation` maps HTTP <-> application DTOs/services.
- `infrastructure` implements ports (DB, hashing, etc.).
