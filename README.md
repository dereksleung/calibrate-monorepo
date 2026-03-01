# Calibrate

A calorie tracker application, because I've gotten into healthier eating, jogging, and calisthenics.

Currently building out the backend as an Express.js app with clean architecture layering to decouple business logic from particular technology choices. Will use the backend to explore/practice various backend topics.

# Tech Stack

## Node.js/Express.js, not NestJS

- I chose Express.js over NestJS to demonstrate clean architecture from first principles.
  - NestJS comes with its own opinionated module system, dependency injection container, and decorator-based patterns. This can be valuable in production, but here they would obscure the point.
  - With Express.js as a thin HTTP layer, every boundary, dependency inversion, and layer relationship is something I explicitly designed rather than something the framework provided for me.

## Kysely, a SQL query builder, rather than an ORM

- I chose a type-safe query builder over an ORM (e.g. Prisma, TypeORM) for three reasons:
  1. **Clean architecture alignment.** ORMs couple persistence concerns to domain models through decorators or generated types. A query builder keeps the mapping between database rows and domain objects explicit and confined to the repository layer.
  2. **SQL control for future analytics.** A calorie tracker naturally leads to aggregation queries, such as weekly averages, macro breakdowns, trend lines. A query builder lets me write and optimize that SQL directly rather than working around an ORM's abstraction.
  3. **Full type safety over Knex.js.** Kysely infers return types from the query itself and provides autocomplete on table and column names, catching schema mismatches at compile time, things Knex.js doesn't offer.

# Setup for Running Locally

1. Install PostgreSQL if needed.
   [Official installers here](https://www.postgresql.org/download/), [instructions on how to use them here](https://www.enterprisedb.com/docs/supported-open-source/postgresql/installing/).
   If you are installing PostgreSQL for the first time with an installer, it likely will ask you
   to set a superuser password, and a port number for the PostgreSQL server to listen for incoming connections. Note them.

2. Add a `.env` file to the project root. Set the following environment variables in it as strings, to the correct values. If you just installed PostgreSQL for the first time, the `DB_NAME` and `DB_USER` are "postgres".

```
DB_NAME="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD=""
```

3. Run `npm ci` in the project root.

4. Run `npm run kysely migrate:latest`. Documentation for kysely's CLI [here](https://github.com/kysely-org/kysely-ctl), see "Project-scoped installation", as it is not installed globally.

5. Run `npm run dev`.
