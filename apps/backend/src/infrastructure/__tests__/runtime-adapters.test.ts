import type { IFoodCatalogWriter } from "@application/ports/food-catalog-writer.js";

import { FoodCatalogSearchService } from "@application/services/food-catalog-search-service.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createFoodCatalogImporter, resolveEmailSender } from "../runtime-adapters.js";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.unstubAllGlobals();
});

function createWriter(): IFoodCatalogWriter {
  return { upsert: vi.fn() };
}

describe("createFoodCatalogImporter", () => {
  it("returns an ordinary empty result without calling FoodData Central in demo mode", async () => {
    process.env.CALIBRATE_DEMO = "1";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const importer = createFoodCatalogImporter({
      apiKey: "fdc-secret-that-must-not-be-used",
      writer: createWriter(),
    });
    const service = new FoodCatalogSearchService(
      { search: vi.fn().mockResolvedValue([]) },
      { search: vi.fn().mockResolvedValue([]) },
      importer,
    );

    const response = await service.search({ userId: "user-1", query: "branded soda", limit: 20 });

    expect(response).toEqual({ results: [], nextCursor: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still uses FoodData Central outside demo mode when an API key is present", async () => {
    delete process.env.CALIBRATE_DEMO;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ foods: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const importer = createFoodCatalogImporter({ apiKey: "fdc-test-key", writer: createWriter() });

    await expect(importer.searchAndImport("greek yogurt", 20)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("api.nal.usda.gov");
  });

  it("keeps the unavailable-provider error outside demo mode when no API key is configured", async () => {
    delete process.env.CALIBRATE_DEMO;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const importer = createFoodCatalogImporter({ apiKey: undefined, writer: createWriter() });

    await expect(importer.searchAndImport("greek yogurt", 20)).rejects.toThrow(
      "Food catalog provider is unavailable",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resolveEmailSender", () => {
  it("does not dispatch real email in demo mode even when a provider credential is present", async () => {
    process.env.CALIBRATE_DEMO = "1";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const sender = resolveEmailSender({ credential: "xkeysib-secret" });

    await sender?.sendAccountEmailVerificationCode({
      email: "person@example.com",
      code: "012345",
      expiresInMinutes: 10,
      deliveryId: "d9428888-122b-4e2b-9c24-2dc8442eaa31",
    });
    await sender?.sendPasskeyAddedNotification({
      email: "person@example.com",
      deliveryId: "d9428888-122b-4e2b-9c24-2dc8442eaa31",
    });

    expect(sender).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still uses the email provider outside demo mode when a credential is present", async () => {
    delete process.env.CALIBRATE_DEMO;
    delete process.env.CALIBRATE_E2E;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "delivery-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const sender = resolveEmailSender({ credential: "xkeysib-secret" });

    await sender?.sendAccountEmailVerificationCode({
      email: "person@example.com",
      code: "012345",
      expiresInMinutes: 10,
      deliveryId: "d9428888-122b-4e2b-9c24-2dc8442eaa31",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("api.brevo.com");
  });
});
