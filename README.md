# Calibrate

Calibrate is a full-stack nutrition-tracking application designed to turn detailed food logs into focused, actionable insights about the foods and habits driving changes in calorie and macronutrient intake.

<table>
  <tr>
    <td><img width="1154" height="940" src="https://github.com/user-attachments/assets/928214b6-e348-492b-a1bc-c099efbbd596" /></td>
    <td><img width="376" height="671" src="https://github.com/user-attachments/assets/b512b7da-aa40-42bb-b7da-8b1adf1fa582" /></td>
  </tr>
</table>

## Table of Contents

- [Product approach](#product-approach)
- [Engineering highlights](#engineering-highlights)
- [Architecture](#architecture)
  - [Frontend architecture](#frontend-architecture)
  - [Backend architecture](#backend-architecture)
- [Data access Solution Design, Tradeoffs Rationale: Expected Usage Patterns](#data-access-solution-design-tradeoffs-rationale-expected-usage-patterns)
- [Data synchronization and caching](#data-synchronization-and-caching)
- [Screenshots](#screenshots)
  - [Nutrient analytics](#nutrient-analytics)
  - [Daily logging](#daily-logging)
- [AI Development and validation workflow](#ai-development-and-validation-workflow)
- [Tech stack](#tech-stack)
- [Run the local demo](#run-the-local-demo)
- [Further technical documentation](#further-technical-documentation)

## Product approach

Nutrition applications can easily become collections of charts that expose more data without making the next decision any clearer. Calibrate instead prioritizes analyses that answer concrete questions a user can act on.

For example, nutrient analytics surface which foods contributed most to calorie or macronutrient intake over the last seven days, as well as which foods increased or decreased most in their share of intake when comparing recent periods. The goal is to help users identify practical adjustments rather than require them to interpret an open-ended analytics dashboard.

The main dashboard follows the same approach. Seven-day nutrition, logging habits, and deeper nutrient analytics are deliberately ordered and kept compact so the most useful information remains visible on both desktop and mobile.

## Engineering highlights

- **Portable frontend core.** `@calibrate/frontend-core` defines frontend-domain models, user-goal workflows, cache behavior, and view-independent projections once for web and an upcoming mobile client. Both can follow the same data and reconciliation rules, reducing duplicated implementation and inconsistent behavior. Browser-specific routing, storage, authentication adapters, and UI remain in web. 

- **Persisted, cache-first data access.** Day Logs are persisted in IndexedDB through TanStack Query and keyed by date. Multiple views derive their data from the same cached records rather than independently fetching equivalent server state.

- **Bounded synchronization instead of unconditional refetching.** The client sends its known Day Log versions to a synchronization endpoint. Unchanged ranges can return `204 No Content`, while changed ranges return only the dates that need updating. Successful writes can patch known cache state without automatically turning each mutation into another full read.

- **Private-cache lifecycle protection.** Because persisted nutrition data belongs to an authenticated user, the cache uses account-scoped generations and durable fencing so a stale tab cannot restore or re-persist another session's data after logout or account changes. The design is documented in [ADR-0004](docs/adr/0004-bounded-day-log-sync-and-cache-fence.md).

- **Clear backend layering.** The Express backend separates presentation, application workflows, domain rules, and infrastructure, keeping framework and persistence details out of the domain and application layers. See the [backend architecture ADR](apps/backend/docs/adr/0001-clean-architecture-and-domain-boundaries.md).

- **Isolated validation environments.** Integration and browser tests use disposable PostgreSQL environments, generated runtime configuration, and dynamically allocated ports. Linked Git worktrees receive separate databases and application ports so multiple development or agent tasks can run concurrently without sharing mutable application state.

## Architecture

Calibrate is organized as an Nx monorepo:

```text
apps/
  web-frontend/          React UI, routing, and browser integrations
  backend/               Express API, application, and domain layers
  web-e2e/               Playwright browser validation

packages/
  frontend-core/         Portable frontend models, workflows, feature behavior, and cache policy
  api-contracts/         HTTP request/response contracts
  dev-bindings/          Development port/origin configuration
  local-runtime-config/  Generated local runtime configuration
```

### Frontend architecture

`@calibrate/frontend-core` holds logic and types shareable between web and an upcoming mobile client. A private API layer validates and maps HTTP responses into frontend-domain models to limit the blast radius of changes to API responses. Public feature workflows orchestrate operations for goals such as saving a food entry, including cache updates and reconciliation. Verticals are like feature folders holding logic and types related to a cohesive area of functionality. 

The web client supplies a configured API transport, UI, and IndexedDB implementations for the browser cache persistence and its logout fence.
With Tanstack Router, route files handle URL and search state, page files compose screens, and verticals own feature behavior that need web-specific details.

The frontend keeps reusable server data cached and separate from page-specific presentation models. For the dashboard, API Day Log data remains in the shared TanStack Query cache while a pure transformation produces the view model consumed by the page. This lets presentation components depend on the shape the interface needs without changing the canonical cached representation.

At the component level, the same attention to capturing what is shared while leaving context-specific composition flexible shapes components like `MiniAnalyticsCard`, a compound component. Common pieces such as titles, chart areas, summary values, separators, and interaction affordances capture reusable styling and layout, while individual Habit and Nutrition cards compose only the pieces appropriate to their behavior.

### Backend architecture

The backend uses Express as a thin HTTP layer around application and domain code rather than making framework concepts the application's architectural boundaries.

Domain objects own business invariants, application services orchestrate workflows and business rules that span aggregates, infrastructure owns PostgreSQL and Kysely persistence details, and presentation owns HTTP validation and wire-format mapping.

Kysely provides typed SQL construction while keeping query and transaction behavior explicit—useful for an application whose analytics and synchronization requirements increasingly depend on deliberate query design.

## Data access Solution Design, Tradeoffs Rationale: Expected Usage Patterns
Food logging and analytics browsing tends to occur in short bursts around meals, when users may move between several related views, followed by relatively long periods of inactivity. Recent logs may still be corrected, while older history becomes progressively more stable, as it gets more inconvenient to remember what you ate, or backfill many days. Those assumptions make cache-heavy reads and lightweight reconciliation a better fit than continuously refetching equivalent data.

They also relax the consistency guarantees the application actually needs. Cross-client changes do not need to appear in real time because it is most convenient to log meals during from one device at a time during breaks, so people will want to minimize time not spent on leisure like meal logging. They likely will not use another client until a later session. Calibrate can therefore reconcile changes at the next session, rather than maintaining continuous synchronization.

The same usage pattern also makes avoiding redundant reads valuable during active logging sessions. A meal may generate several writes in a short period, so successful mutations return enough information for the initiating client to update compatible cached state directly rather than immediately refetching the complete server representation after every write.

[Read the full data-access design rationale](docs/design/data-access-strategy.md)

## Data synchronization and caching

User activity is expected to cluster around meals: several writes and related reads may happen in a short session, followed by a long inactive period.

Calibrate therefore favors reuse while a user is active and lightweight revalidation when they return. Day Logs normally remain fresh for one hour. When revalidation is required, the client sends a bounded manifest describing the dates and versions it already knows; the server compares that manifest against a narrow PostgreSQL projection before deciding whether complete Day Log data needs to be returned.

Mutation responses contain enough information to update compatible cached state directly. This avoids following every food-entry write with an immediate full refetch while still allowing another client to be reconciled later.

The complete synchronization, privacy, cross-tab, and failure-recovery design is documented in [Bounded Day Log synchronization and cache-lifecycle fencing](docs/adr/0004-bounded-day-log-sync-and-cache-fence.md).

## Screenshots

### Nutrient analytics

The Total view highlights the foods contributing most to a selected nutrient. The Change view focuses on foods whose relative contribution has changed most between recent periods, turning historical logging data into a smaller set of trends worth investigating.

<table>
  <tr>
    <td><img width="1128" height="946" src="https://github.com/user-attachments/assets/51b9937e-d8e7-43ec-add5-5e448c706a8e" /></td>
    <td><img width="1114" height="947" src="https://github.com/user-attachments/assets/f7808d2d-247b-47dc-b44d-33c794025083" /></td>
  </tr>
</table>

### Daily logging

The Logs page keeps current calorie and macro status close to the food-entry workflow so users can adjust during the day rather than only review results afterward.

The calendar week scroller at the top also shows visually shows percent of calories eaten against the limit for the entire week, providing more
motivation to adjust if needed.

<table>
  <tr>
    <td><img width="1190" height="1010" src="https://github.com/user-attachments/assets/ef640302-4af4-478c-8220-4549f2e75bdf" /></td>
    <td><img width="378" height="672" src="https://github.com/user-attachments/assets/00674ac0-db41-43f1-9e24-333ba6ce1051" /></td>
  </tr>
</table>

## AI Development and validation workflow

Calibrate is also a testbed for development workflows in which AI agents can work on multiple changes concurrently without sharing fragile local state.

Linked Git worktrees are assigned their own PostgreSQL database, frontend/backend port pair, and matching runtime configuration. Browser E2E runs go further by provisioning a disposable PostgreSQL container with generated credentials, applying migrations, selecting available application ports, and starting the frontend and backend before Playwright exercises the system.

AI-assisted changes are validated through the same engineering controls used for ordinary development: unit and integration tests, type checking, linting, Playwright browser flows, screenshots/manual behavioral checks where appropriate, and review of architecture-sensitive changes.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, TanStack Query, TanStack Router, Tailwind CSS, Storybook |
| Backend | Node.js, Express, TypeScript, PostgreSQL, Kysely, Zod |
| Authentication | WebAuthn/passkeys, cookie-backed server sessions |
| Testing | Vitest, React Testing Library, Playwright, Testcontainers |
| Tooling | Nx, Docker, Git worktrees |

For the reasoning behind several of these choices, see
[Technology choices](docs/design/technology-choices.md).

## Run the local demo

The evaluator demo is self-contained and does not require private keys, email-provider credentials, or a FoodData Central API key.

**Prerequisites**

- Node.js 26
- Docker Desktop
- Host port `5433` available

From a fresh clone:

```bash
npm ci
npx nx run @calibrate/local-runtime-config:demo-setup
npx nx run @calibrate/local-runtime-config:demo-dev
```

Open the URL printed by `demo-dev` and choose **Start local test session**.

The demo uses a pinned USDA Foundation Foods dataset and does not send real email or call FoodData Central.

`demo-setup` is idempotent: it writes or reuses gitignored `.local.env`, starts PostgreSQL, applies migrations, and seeds the catalog. To recreate the Demo database while keeping that generated configuration:

```bash
npx nx run @calibrate/local-runtime-config:demo-reset
```

For a complete local development setup where you supply env vars, see [DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Further technical documentation

- [Backend clean architecture and domain boundaries](apps/backend/docs/adr/0001-clean-architecture-and-domain-boundaries.md)
- [Email verification and cookie-backed server sessions](apps/backend/docs/adr/0002-email-otp-and-cookie-backed-server-sessions.md)
- [Bounded Day Log synchronization and cache-lifecycle fencing](docs/adr/0004-bounded-day-log-sync-and-cache-fence.md)
- [Dashboard V2 product and implementation decisions](docs/tasks/dashboard-v2/PRD.md)
- [Self-contained local demo mode](docs/adr/0004-self-contained-local-demo-mode.md)
- [Loopback-only local test sessions](apps/backend/docs/adr/0004-loopback-only-local-test-session.md)
