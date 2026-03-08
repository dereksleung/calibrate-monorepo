# Architectural Decisions and Rationales

## Project structure

The project follows clean architecture with these layers:

- `src/domain/` — domain entities, value objects, business rules, no dependencies on outer layers
- `src/application/` — services (use case coordination), ports (repository interfaces), DTOs
- `src/infrastructure/` — concrete implementations and technology choices (Postgres repositories, Kysely query builder, HTTP controllers)
- `src/presentation/` - controllers, http request/response shapes, mappers transforming application layer values to response values, validation of http requests, routes definitions

---

## Aggregate roots and child entities

As an example, see the aggregate root `DayLog` and its child entity `FoodEntry`.

- src/domain/entities/day-log.ts
- src/domain/entities/food-entry.ts

`DayLog` is the aggregate root for a user's nutrition data on a given day. It is a consistency enforcement boundary for child entities: `DayLog` and its child entities must be strongly consistent, for business rules to work correctly and not lead to an invalid system state.

`FoodEntry` is a child entity. Because of this:

- All mutations to `FoodEntry` rows in the database must go through `DayLogRepository`, not through a separate `FoodEntryRepository` exposed to the service layer.
- This prevents callers from bypassing `DayLog`'s invariants (currently: max 25 food entries per meal, enforced in `DayLog.addFoodEntry()`).
- The "one repository per aggregate root for writes" guideline from DDD applies here. A separate `FoodEntryRepository` with write access would undermine the aggregate boundary.

---

## The Load-Modify-Save pattern is used for mutations

When adding a food entry, the `DayLogService`:

1. Loads the full `DayLog` aggregate from `DayLogRepository` - at this scale, loading DayLog and its FoodEntry rows is still performant.
2. Calls a behavior method on the domain object (`dayLog.addFoodEntry(entry)`), which enforces invariants
3. Calls `dayLogRepository.addFoodEntry(dayLog.id, entry)` to persist only the new child row.

This is not a full `save(aggregate)` — the repository exposes a targeted write method `addFoodEntry` rather than a full upsert. This is an intentional trade-off: it is more efficient than a `save()` with full diffing, adding a single food entyr is a very frequent operation. `save()` with full diffing also would be more purist DDD but adds complexity.

This is reflected in src/application/services/day-log-service.ts `DayLogServiceImpl.addFoodEntry()` and src/infrastructure/persistence/repositories/postgres-day-log-repository.ts `PostgresDayLogRepository.addFoodEntry()`.

---

## Business logic that spans aggregates lives in the service layer

`DayLogServiceImpl.addFoodEntry()` checks a subscription rule (users can only have 7 day logs before subscribing) by coordinating `UserRepository` and `DayLogRepository`. This rule spans two aggregates, so it lives in the service layer, not inside `DayLog` the domain class.

---

## DAOs vs repositories

`PostgresDayLogRepository` contains private helper methods (`getFoodEntriesByDayLogId`, `mapRowToFoodEntry`, `mapFoodEntryToRow`) for reuse within the class. These are not exposed as separate DAOs or repositories. Extracting a `FoodEntryDao` for internal use is an option if the class grows, but has not been done yet.

The distinction in this codebase:

- **Repository**: domain-oriented, speaks in domain terms (methods return aggregate or entity), exposed as a port in the application layer
- **DAO**: table-oriented, talks to one or more tables, implementation detail hidden inside a repository

---

## Naming conventions

- `FoodEntryController` is acceptable even though the operation goes through `DayLogService`. Controllers are an HTTP routing concern, not a domain modeling concern. The service dependency determines domain ownership, not the controller name.
- Domain factory methods are named `Entity.create(props)` for new entities and `Entity.reconstitute(props)` for rehydrating from persistence. This makes clear which path generates a new ID vs. restoring an existing one.
- HTTP request/response shapes live in `src/presentation/http`.

---

## Transactions

See `PostgresDayLogRepository.addFoodEntry()` in src/infrastructure/persistence/repositories/postgres-day-log-repository.ts. The repository owns the transaction boundary; the service layer does not manage transactions directly.

---

## Explicitly deferred

- Full aggregate `save()` / upsert / diff mechanism
- A `FoodEntryDao` internal extraction (only warranted if `PostgresDayLogRepository` grows unwieldy)
- A read-only `FoodEntryQueryPort` for reporting (only warranted if reporting queries need a service-layer abstraction)
