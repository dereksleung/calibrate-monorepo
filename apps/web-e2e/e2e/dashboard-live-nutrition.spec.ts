import { expect, test, type Page } from "@playwright/test";

const CONTENT_FRAME_VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 768, height: 800 },
  { width: 1024, height: 800 },
  { width: 1440, height: 900 },
] as const;

async function expectHeaderAlignsWithPageContent(page: Page) {
  const headerFrame = page.locator("header > *").first();
  const pageFrame = page.locator("main > *").first();
  const headerBox = await headerFrame.boundingBox();
  const pageBox = await pageFrame.boundingBox();

  expect(headerBox).toBeTruthy();
  expect(pageBox).toBeTruthy();
  expect(Math.abs(headerBox!.x - pageBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(headerBox!.x + headerBox!.width - (pageBox!.x + pageBox!.width))).toBeLessThanOrEqual(1);
}

test("searching and saving seeded food updates the live dashboard nutrition cards", async ({ context, page }) => {
  test.skip(
    process.env.CALIBRATE_E2E_SEEDED_CATALOG !== "1",
    "This journey requires the seeded Foundation Foods catalog.",
  );

  await context.credentials.install();
  await page.goto("signup-login");

  await page.getByRole("button", { name: "Authorize create passkey" }).click();
  await expect(page.getByRole("heading", { name: "Set up your passkey" })).toBeVisible();

  await page.getByRole("button", { name: "Create passkey" }).click();
  await expect(page.getByRole("heading", { name: "Seven-day nutrition" })).toBeVisible();

  for (const viewport of CONTENT_FRAME_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expectHeaderAlignsWithPageContent(page);
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("logs");
  const breakfast = page.getByRole("region", { name: "Breakfast" });
  await breakfast.getByRole("button", { name: "+ Add Item" }).click();

  await expect(page.getByRole("heading", { name: "Recently logged" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search foods" }).fill("Broccoli");
  await expect(page.getByRole("heading", { name: "Search results" })).toBeVisible();
  await page.getByRole("button", { name: "Select Broccoli, raw" }).click();

  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await page.locator("#food-quantity").fill("2");
  await expect(page.getByLabel(/^47 calories,/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(breakfast.getByText("Broccoli, raw")).toBeVisible();
  await expect(breakfast.getByRole("listitem").getByText("47", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Overview" }).click();

  const calories = page.getByRole("region", { name: "Calories" });
  await expect(calories).toContainText("47");
  await expect(page.getByRole("table", { name: "Seven-day nutrition summary" })).toContainText("47.1 kcal");
});
