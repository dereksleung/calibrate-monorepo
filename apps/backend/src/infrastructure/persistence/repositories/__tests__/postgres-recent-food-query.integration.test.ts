import { randomUUID } from "node:crypto";

import type { DatabaseClient } from "../../database-client.js";
import type { InsertableUser } from "../../schemas/users-table.js";

import {
  clearIntegrationDatabase,
  createIntegrationDatabaseClient,
} from "../../../../../test/integration/database.js";
import { PostgresRecentFoodQuery } from "../postgres-recent-food-query.js";

const now = new Date("2026-08-06T12:00:00.000Z");

async function insertUser(databaseClient: DatabaseClient, email: string): Promise<string> {
  const userInput: InsertableUser & { id: string } = {
    id: randomUUID(),
    email,
    password_hash: null,
    email_verified_at: now,
    webauthn_user_handle: `${email}-handle`,
    tier: "FREE",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const user = await databaseClient
    .insertInto("users")
    .values(userInput)
    .returning("id")
    .executeTakeFirstOrThrow();
  return user.id;
}

async function insertDayLog(
  databaseClient: DatabaseClient,
  input: { userId: string; date: string },
): Promise<string> {
  const id = randomUUID();
  await databaseClient
    .insertInto("day_logs")
    .values({ id, date: input.date, user_id: input.userId })
    .execute();
  return id;
}

async function insertFoodEntry(
  databaseClient: DatabaseClient,
  input: {
    dayLogId: string;
    name: string;
    brand: string | null;
    chosenQuantity: number;
    chosenUnit: string;
    calories: number;
    createdAt: Date;
  },
): Promise<void> {
  await databaseClient
    .insertInto("food_entries")
    .values({
      id: randomUUID(),
      day_log_id: input.dayLogId,
      food_catalog_id: null,
      meal: "BREAKFAST",
      name: input.name,
      brand: input.brand,
      icon_name: null,
      chosen_quantity: input.chosenQuantity,
      chosen_unit: input.chosenUnit,
      quantity_serving: 1,
      serving_label: "cup",
      quantity_mass: null,
      mass_unit: null,
      quantity_volume: null,
      volume_unit: null,
      calories: input.calories,
      total_fat_grams: 4,
      saturated_fat_grams: 1,
      cholesterol_mg: 0,
      sodium_mg: 10,
      total_carbohydrate_grams: 20,
      fiber_grams: 3,
      sugar_grams: 5,
      protein_grams: 8,
      created_at: input.createdAt.toISOString(),
      updated_at: input.createdAt.toISOString(),
    })
    .execute();
}

describe("PostgresRecentFoodQuery", () => {
  let databaseClient: DatabaseClient;
  let query: PostgresRecentFoodQuery;

  beforeAll(() => {
    databaseClient = createIntegrationDatabaseClient();
    query = new PostgresRecentFoodQuery(databaseClient);
  });

  beforeEach(async () => {
    await clearIntegrationDatabase(databaseClient);
  });

  afterAll(async () => {
    await databaseClient.destroy();
  });

  it("returns the stored serving and nutrition fields for a matching recent entry", async () => {
    const userId = await insertUser(databaseClient, "owner@example.com");
    const dayLogId = await insertDayLog(databaseClient, {
      userId,
      date: Temporal.Now.plainDateISO("UTC").subtract({ days: 1 }).toString(),
    });
    await insertFoodEntry(databaseClient, {
      dayLogId,
      name: "Greek yogurt",
      brand: "Calibrate Kitchen",
      chosenQuantity: 2,
      chosenUnit: "cups",
      calories: 300,
      createdAt: now,
    });

    await expect(query.search({ userId, query: "GREEK", limit: 10 })).resolves.toEqual([
      expect.objectContaining({
        catalogFoodId: null,
        chosenQuantity: 2,
        chosenUnit: "cups",
        name: "Greek yogurt",
        brand: "Calibrate Kitchen",
        quantityServing: 1,
        servingLabel: "cup",
        calories: 300,
      }),
    ]);
  });

  it("scopes results to the user and recent window, then orders and limits them", async () => {
    const ownerId = await insertUser(databaseClient, "owner@example.com");
    const otherUserId = await insertUser(databaseClient, "other@example.com");
    const today = Temporal.Now.plainDateISO("UTC");
    const newestDayLogId = await insertDayLog(databaseClient, {
      userId: ownerId,
      date: today.subtract({ days: 1 }).toString(),
    });
    const olderDayLogId = await insertDayLog(databaseClient, {
      userId: ownerId,
      date: today.subtract({ days: 2 }).toString(),
    });
    const expiredDayLogId = await insertDayLog(databaseClient, {
      userId: ownerId,
      date: today.subtract({ days: 15 }).toString(),
    });
    const otherUserDayLogId = await insertDayLog(databaseClient, {
      userId: otherUserId,
      date: today.subtract({ days: 1 }).toString(),
    });

    await insertFoodEntry(databaseClient, {
      dayLogId: newestDayLogId,
      name: "Berry bowl",
      brand: "Oats Company",
      chosenQuantity: 1,
      chosenUnit: "bowl",
      calories: 200,
      createdAt: new Date("2026-08-06T12:00:02.000Z"),
    });
    await insertFoodEntry(databaseClient, {
      dayLogId: olderDayLogId,
      name: "Overnight oats",
      brand: "Kitchen",
      chosenQuantity: 1,
      chosenUnit: "cup",
      calories: 180,
      createdAt: new Date("2026-08-06T12:00:01.000Z"),
    });
    await insertFoodEntry(databaseClient, {
      dayLogId: expiredDayLogId,
      name: "Expired oats",
      brand: "Oats Company",
      chosenQuantity: 1,
      chosenUnit: "cup",
      calories: 150,
      createdAt: new Date("2026-08-06T12:00:03.000Z"),
    });
    await insertFoodEntry(databaseClient, {
      dayLogId: otherUserDayLogId,
      name: "Other user's oats",
      brand: "Oats Company",
      chosenQuantity: 1,
      chosenUnit: "cup",
      calories: 150,
      createdAt: new Date("2026-08-06T12:00:04.000Z"),
    });

    await expect(query.search({ userId: ownerId, query: "OATS", limit: 1 })).resolves.toMatchObject([
      { name: "Berry bowl", lastUsedDate: today.subtract({ days: 1 }).toString() },
    ]);
    await expect(query.search({ userId: ownerId, query: "OATS", limit: 10 })).resolves.toMatchObject([
      { name: "Berry bowl" },
      { name: "Overnight oats" },
    ]);
  });
});
