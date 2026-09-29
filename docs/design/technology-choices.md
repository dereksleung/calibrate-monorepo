# Technology Choices

## Why Nx?

This project uses Nx to support a scalable monorepo architecture. Nx gives the codebase a clear project structure, strong tooling around dependency boundaries, and a better developer experience as the system grows.

- One of the main reasons for choosing Nx is its ability to understand the dependency graph of the workspace. This allows Nx to determine which projects are affected by a change and run only the relevant checks, such as tests, linting, typechecking, or builds. That keeps feedback fast while still giving confidence that related parts of the system have not been broken.
- Another reason for using Nx is future scalability. If parts of the backend eventually need to be extracted into separate services or microservices, having the code organized as independent projects inside a monorepo makes that transition easier. The workspace can evolve gradually without forcing an early split into multiple repositories.

In short, Nx was chosen because it provides:

- a structured monorepo setup
- automatic project dependency tracking
- affected-based testing, linting, typechecking, and builds
- faster local and CI feedback
- better support for enforcing architectural boundaries
- a smoother path toward future service extraction if the system grows in that direction

## Backend

Currently building out the backend as an Express.js app drawing from clean architecture layering to decouple business logic from particular technology choices.
Will use the backend to explore/practice various backend topics.

### Node.js/Express.js, not NestJS

- I chose Express.js over NestJS to demonstrate clean architecture from first principles.
  - NestJS comes with its own opinionated module system, dependency injection container, and decorator-based patterns. This can be valuable in production, but here they would obscure the point.
  - With Express.js as a thin HTTP layer, every boundary, dependency inversion, and layer relationship is something I explicitly designed rather than something the framework provided for me.

### Kysely, a SQL query builder, rather than an ORM

- I chose a type-safe query builder over an ORM (e.g. Prisma, TypeORM) for three reasons:
  1. **Clean architecture alignment.** ORMs couple persistence concerns to domain models through decorators or generated types. A query builder keeps the mapping between database rows and domain objects explicit and confined to the repository layer.
  2. **SQL control for future analytics.** A calorie tracker naturally leads to aggregation queries, such as weekly averages, macro breakdowns, trend lines. A query builder lets me write and optimize that SQL directly rather than working around an ORM's abstraction.
  3. **Full type safety over Knex.js.** Kysely infers return types from the query itself and provides autocomplete on table and column names, catching schema mismatches at compile time, things Knex.js doesn't offer.

## Frontend

- TanStack Router was chosen because it gives the app fully-typed routing with room to grow into route loaders for high network performance for mobile users taking time of their busy day to jot down meal entries.

- shadcn/ui is useful here for helping build battle-tested, accessible, polished UI quickly while still allowing keeping ownership over styling.