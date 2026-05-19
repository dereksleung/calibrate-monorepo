# Calibrate

A calorie tracker application, because I've gotten into healthier eating, jogging, and calisthenics.

Currently building out the backend as an Express.js app with clean architecture layering to decouple business logic from particular technology choices. Will use the backend to explore/practice various backend topics.

# Tech Stack

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

# Setup for Running Locally
## Common
1. Run `npm ci` in the project root.

## Backend
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
DB_PASSWORD="<password_from_earlier>"
JWT_KEY_ID="local-dev"
JWT_ACCESS_TOKEN_TTL_SECONDS="900"
ISSUER="http://localhost:3000/"
JWT_AUDIENCE="http://localhost:3000/api"
```

3. Generate an Ed25519 private key .pem file using `openssl genpkey -algorithm ED25519 -out jwt-ed25519-private.pem`.

4. Copy the .pem file contents to the .env file like JWT_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n(the_private_key)\n-----END PRIVATE KEY-----". It will be encrypted using dotenvx, which is a project dependency.

6. Run `npm ci` in the project root.

7. Run `npx dotenvx encrypt`. It should generate a .env.keys file with a private key, and encrypt the values in .env.
   Dotenvx docs [here](https://dotenvx.com/docs/learn/encrypting/introduction)

8. Run `npx nx run backend:kysely migrate:latest`. Documentation for kysely's CLI [here](https://github.com/kysely-org/kysely-ctl), see "Project-scoped installation", as it is not installed globally.

9. Run `npx nx run backend:dev`.

10. Other commands can be run like `npx nx run (project_name):(command_name) (args)`. Project names are found in `apps/app-folder/package.json`'s `name` field, the available command names comes from the `scripts` field.
Nx documentation [here](https://nx.dev/docs/getting-started/tutorials/running-tasks#running-a-single-task)

## Frontend

### Current state
The current UI is a prototype built with mock data, most things are not actually functional, pages do not load live data yet. That is intentional. It lets the product direction, information hierarchy, and interaction patterns come first before backend contracts or analytics plumbing harden too early.

The first goal right now is to demonstrate product judgment: take what could easily become dense, data-heavy areas in the Dashboard and Goals pages, and keep them simple enough to be useful. The target user is not an expert mathematician or nutrition analyst, rather they are people wanting to change themselves, who may need help building new habits, and need to understand what to do next, and what is working or not working. The most important product work is surfacing actions and actionable insights that help them keep momentum with new habits, while suggesting small tweaks they may not have realized they can do that will help them get results.

Charts and data stay at overview level by default. When a user chooses to drill deeper, the app should still be selective about what it shows. More data is only useful when it creates a clearer insight, a better decision, or a practical adjustment the user can actually make.

### Running Frontend Locally
1. Start the dev server:

```bash
npx nx run web:dev
```

The app runs at:

```text
http://localhost:3000
```


### Screenshots
#### Dashboard page
Initial page:
<br></br>
<img width="1820" height="932" alt="Screenshot 2026-05-03 at 6 17 09 PM" src="https://github.com/user-attachments/assets/97d5fe74-0583-4620-bf64-446ff2f40127" />
<br></br>
On clicking the High Impact Swap card's Learn More link -> panel with actionable insights:
<br></br>
<img width="1829" height="930" alt="Screenshot 2026-05-03 at 6 17 44 PM" src="https://github.com/user-attachments/assets/ae5fc0c5-0525-4192-8d08-4e9c8576dc4c" />

<br></br>
Hovering over the Dashboard's Fats chart will show a tooltip saying you can click the chart to go to [a panel on the Goals page](#fats-analytics-panel), making that discoverable. Only the fats detail view mock UI is built right now.
<br></br>


#### Goals page
Allows deeper drilling into stats and progress.

Initial view:
<br></br>
<img width="1242" height="949" alt="Screenshot 2026-05-03 at 6 18 50 PM" src="https://github.com/user-attachments/assets/1427dd89-c3a7-4362-8860-d784edea9306" />
<br></br>
Scrolling down - can see encouragement about journey, as well as charts about macros (fats only for now):
<br></br>
<img width="1232" height="950" alt="Screenshot 2026-05-03 at 6 19 11 PM" src="https://github.com/user-attachments/assets/2bb2a236-c1fe-41c8-be1b-c3bbad402cd0" />
<br></br>

#### Fats Analytics panel
Clicking the Fats bar chart opens a panel with deeper data the user can find trends with.
<br></br>
Greatest sources of fat by food in the last month:
<br></br>
<img width="1228" height="940" alt="Screenshot 2026-05-03 at 7 31 07 PM" src="https://github.com/user-attachments/assets/bf3d56cb-9d9b-485e-958a-30bfc1c6c6d8" />
<br></br>
Largest changes in fat contributions from food between last month to this month:
<br></br>
<img width="1247" height="946" alt="Screenshot 2026-05-03 at 6 27 50 PM" src="https://github.com/user-attachments/assets/22b50006-90a7-472a-8ef2-bb78a4e56b00" />

