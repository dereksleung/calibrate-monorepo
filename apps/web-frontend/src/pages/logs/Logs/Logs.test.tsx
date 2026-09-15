// @vitest-environment jsdom

import { createQueryClient } from "#/shared/api/query-client.ts";
import { APP_CONTENT_FRAME_CLASS_NAME } from "#/shared/layout/app-content-frame.ts";
import { createDayLogSyncResponse } from "@calibrate/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "../../../routeTree.gen.ts";
import { dayLogSlotQueryKey } from "../../../verticals/day-log-cache/day-log-cache.ts";
import { coffeeFixture, oatmealFixture } from "../log-page-fixtures.ts";

vi.mock("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => null,
}));

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}));

const dayLogMay18Response = {
  id: "94e23c4b-cd80-4b8e-b10c-4b263e710ec2",
  date: "2026-05-18",
  breakfast: [oatmealFixture, coffeeFixture],
  lunch: [],
  dinner: [],
  snacks: [],
  weight: 184.2,
};

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function authenticatedSessionResponse() {
  return new Response(
    JSON.stringify({
      user: {
        id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        email: "person@example.com",
        tier: "FREE",
        createdAt: "2030-01-01T00:00:00.000Z",
        updatedAt: "2030-01-01T00:00:00.000Z",
      },
      sessionTransport: "cookie",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL, init) => {
    const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
    if (url.includes("/auth/session")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            user: {
              id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
              email: "person@example.com",
              tier: "FREE",
              createdAt: "2030-01-01T00:00:00.000Z",
              updatedAt: "2030-01-01T00:00:00.000Z",
            },
            sessionTransport: "cookie",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }
    if (url.includes("/daylogs:sync")) {
      const { endDate } = JSON.parse(init!.body as string) as { endDate: string };
      return Promise.resolve(
        new Response(
          JSON.stringify(
            createDayLogSyncResponse([
              {
                date: endDate,
                dayLog: endDate === "2026-05-18" ? dayLogMay18Response : null,
                versionNumber: endDate === "2026-05-18" ? 1 : null,
              },
            ]),
          ),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderLogsRoute(
  queryClient: QueryClient = createQueryClient(),
  initialEntry = "/logs?date=2026-05-18",
) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry],
    }),
    defaultPreload: "intent",
    scrollRestoration: false,
  });

  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

describe("Logs", () => {
  it("renders the daily overview shell from fixture data", async () => {
    renderLogsRoute();

    expect(await screen.findByRole("heading", { name: "May 18" })).toBeTruthy();
    expect((await screen.findAllByText("282")).length).toBeGreaterThan(0);
    expect(screen.getByText("/ 1,800")).toBeTruthy();
    expect(screen.getByText("1,518 left")).toBeTruthy();
    expect(screen.getByDisplayValue("184.2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit weight" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Meals" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Breakfast" })).toBeTruthy();
    expect(screen.getByText("Oatmeal")).toBeTruthy();
    expect(screen.getByText("Black coffee")).toBeTruthy();
    expect(screen.getByRole("main").firstElementChild?.className).toContain(APP_CONTENT_FRAME_CLASS_NAME);
    expect(screen.getByRole("region", { name: "Daily summary" }).className).toContain("glass-card");
    expect(screen.getByRole("region", { name: "Breakfast" }).className).toContain("glass-card");
  });

  it("renders empty meal states and meal add actions", async () => {
    renderLogsRoute();

    expect(await screen.findByRole("heading", { name: "Lunch" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "+ Add Item" }).length).toBe(4);

    fireEvent.click(screen.getAllByRole("button", { name: "+ Add Item" })[1]);

    expect(await screen.findByRole("heading", { name: "Recently logged" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search foods" })).toBeTruthy();
  });

  it("opens the quick log drawer from the floating action button", async () => {
    renderLogsRoute();

    fireEvent.click(await screen.findByRole("button", { name: "Open quick log actions" }));

    expect(await screen.findByText("Quick log")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search food" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log weight" })).toBeTruthy();
  });

  it("logs a weight from a Known-empty summary and patches the cache only after success", async () => {
    const queryClient = new QueryClient();
    const fetchMock = vi.mocked(globalThis.fetch);
    let resolveWrite!: (response: Response) => void;
    const writeResponse = new Promise<Response>((resolve) => {
      resolveWrite = resolve;
    });

    fetchMock.mockImplementation((input) => {
      const url = getFetchUrl(input);
      if (url.includes("/auth/session")) return Promise.resolve(authenticatedSessionResponse());
      if (url.includes("/daylogs:sync")) {
        return Promise.resolve(
          jsonResponse(createDayLogSyncResponse([{ date: "2026-05-18", versionNumber: null, dayLog: null }])),
        );
      }
      if (url.includes("/daylogs/2026-05-18/weight")) return writeResponse;
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    renderLogsRoute(queryClient);

    fireEvent.click(await screen.findByRole("button", { name: "Log weight" }));
    const input = await screen.findByRole("textbox", { name: "Weight in pounds" });
    fireEvent.change(input, { target: { value: "182.45" } });
    fireEvent.blur(input);

    expect(await screen.findByText("Saving..")).toBeTruthy();
    expect(
      queryClient.getQueryData(dayLogSlotQueryKey("e74942b3-78d7-48e8-bd20-dc5eba7f82ff", "2026-05-18")),
    ).toBeNull();

    const weightCalls = fetchMock.mock.calls.filter(([request]) =>
      getFetchUrl(request).includes("/daylogs/2026-05-18/weight"),
    );
    expect(weightCalls).toHaveLength(1);
    expect(JSON.parse(weightCalls[0]?.[1]?.body as string)).toEqual({ weight: 182.5 });
    expect(JSON.parse(weightCalls[0]?.[1]?.body as string)).not.toHaveProperty("versionNumber");

    resolveWrite(jsonResponse({ versionNumber: 1, createdDayLogId: "day-log-weight-1" }, 201));

    expect(await screen.findByDisplayValue("182.5")).toBeTruthy();
    expect(screen.queryByText("Saving..")).toBeNull();
    expect(
      queryClient.getQueryData(dayLogSlotQueryKey("e74942b3-78d7-48e8-bd20-dc5eba7f82ff", "2026-05-18")),
    ).toEqual(expect.objectContaining({ id: "day-log-weight-1", weight: 182.5 }));
    expect(
      fetchMock.mock.calls.filter(([request]) => {
        const url = getFetchUrl(request);
        return url.includes("/daylogs/") && !url.includes("/weight");
      }),
    ).toHaveLength(0);
  });

  it("restores the saved weight after an unsuccessful write and ignores edits in flight", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    let resolveWrite!: (response: Response) => void;
    const writeResponse = new Promise<Response>((resolve) => {
      resolveWrite = resolve;
    });

    fetchMock.mockImplementation((input) => {
      const url = getFetchUrl(input);
      if (url.includes("/auth/session")) return Promise.resolve(authenticatedSessionResponse());
      if (url.includes("/daylogs:sync")) {
        return Promise.resolve(
          jsonResponse(
            createDayLogSyncResponse([{ date: "2026-05-18", versionNumber: 1, dayLog: dayLogMay18Response }]),
          ),
        );
      }
      if (url.includes("/daylogs/2026-05-18/weight")) return writeResponse;
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    renderLogsRoute();

    fireEvent.click(await screen.findByRole("button", { name: "Edit weight" }));
    const input = await screen.findByRole("textbox", { name: "Weight in pounds" });
    fireEvent.change(input, { target: { value: "190" } });
    fireEvent.blur(input);
    expect(await screen.findByText("Saving..")).toBeTruthy();

    fireEvent.change(input, { target: { value: "191" } });
    resolveWrite(jsonResponse({ error: "write failed" }, 500));

    expect(await screen.findByDisplayValue("184.2")).toBeTruthy();
    expect(screen.queryByDisplayValue("190.0")).toBeNull();
    expect(screen.queryByDisplayValue("191.0")).toBeNull();
    expect(screen.queryByText("Saving..")).toBeNull();
    expect(
      fetchMock.mock.calls.filter(([request]) => getFetchUrl(request).includes("/daylogs/2026-05-18/weight")),
    ).toHaveLength(1);
  });

  it("does not write for invalid, empty, or unchanged rounded values", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation((input) => {
      const url = getFetchUrl(input);
      if (url.includes("/auth/session")) return Promise.resolve(authenticatedSessionResponse());
      if (url.includes("/daylogs:sync")) {
        return Promise.resolve(
          jsonResponse(
            createDayLogSyncResponse([{ date: "2026-05-18", versionNumber: 1, dayLog: dayLogMay18Response }]),
          ),
        );
      }
      return Promise.resolve(jsonResponse({ error: "unexpected write" }, 500));
    });

    renderLogsRoute();

    for (const value of ["abc", "", "184.24"]) {
      fireEvent.click(await screen.findByRole("button", { name: "Edit weight" }));
      const input = await screen.findByRole("textbox", { name: "Weight in pounds" });
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);
      expect(await screen.findByDisplayValue("184.2")).toBeTruthy();
    }

    expect(
      fetchMock.mock.calls.filter(([request]) => getFetchUrl(request).includes("/daylogs/2026-05-18/weight")),
    ).toHaveLength(0);
  });

  it("renders a compact title and the selected Sunday-through-Saturday week", async () => {
    renderLogsRoute();

    expect(await screen.findByRole("heading", { name: "May 18" })).toBeTruthy();
    expect(screen.getAllByRole("list", { name: "Calendar week" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /May/ })).toHaveLength(14);
    await screen.findAllByText("282");
    expect(
      screen
        .getByRole("link", { name: /May 18/ })
        .querySelector("[stroke-dashoffset]")
        ?.getAttribute("stroke-dashoffset"),
    ).not.toBe("113.09733552923255");
  });

  it("uses date numbers for past weeks and writes the selected day to the URL", async () => {
    const { router } = renderLogsRoute();

    const maySeventeen = await screen.findByRole("link", { name: /May 17/ });
    expect(maySeventeen.textContent).toContain("17");

    fireEvent.click(maySeventeen);

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ date: "2026-05-17" });
    });
  });

  it("uses weekday labels, a dotted zero-calorie ring, and disables upcoming days in the current week", async () => {
    renderLogsRoute(createQueryClient(), "/logs?date=2026-09-15");

    const selectedDay = await screen.findByRole("link", { name: /September 15/ });
    expect(selectedDay.textContent).toContain("T");
    expect(selectedDay.querySelector('[data-dotted="true"]')).toBeTruthy();
    expect(screen.getAllByLabelText(/upcoming/)).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: /September 16/ })).toBeNull();
  });

  it("syncs the selected range and the visible plus previous calendar weeks without future dates", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    renderLogsRoute(createQueryClient(), "/logs?date=2026-09-15");

    await screen.findByRole("heading", { name: "Today" });

    const syncBodies = fetchMock.mock.calls
      .filter(([request]) => getFetchUrl(request).includes("/daylogs:sync"))
      .map(([, init]) => JSON.parse(init!.body as string));

    expect(syncBodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startDate: "2026-09-09", endDate: "2026-09-15" }),
        expect.objectContaining({ startDate: "2026-09-06", endDate: "2026-09-15" }),
      ]),
    );
    expect(JSON.stringify(syncBodies)).not.toContain("2026-09-16");
  });

  it("keeps the URL and title stable while a week is dragged, then snaps to the older Sunday", async () => {
    const { router } = renderLogsRoute(createQueryClient(), "/logs?date=2026-09-15");

    const scroller = await screen.findByTestId("calendar-week-scroller");
    Object.defineProperty(scroller, "scrollLeft", { configurable: true, value: 640, writable: true });
    fireEvent.scroll(scroller);
    fireEvent(scroller, new Event("scrollend"));

    expect(router.state.location.search).toEqual({ date: "2026-09-15" });
    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(await screen.findByTestId("calendar-week-2026-09-06")).toBeTruthy();
  });

  it("clamps the future direction and exposes desktop week chevrons without changing the URL", async () => {
    const { router } = renderLogsRoute(createQueryClient(), "/logs?date=2026-09-15");

    expect(((await screen.findByRole("button", { name: "Next week" })) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(await screen.findByTestId("calendar-week-2026-09-06")).toBeTruthy();
    expect(router.state.location.search).toEqual({ date: "2026-09-15" });
  });

  it("prefetches the snapped week and its previous week while mounting only the visible week and older overscan", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    renderLogsRoute(createQueryClient(), "/logs?date=2026-09-15");

    fireEvent.click(await screen.findByRole("button", { name: "Previous week" }));
    await screen.findByTestId("calendar-week-2026-09-06");

    expect(screen.getAllByTestId(/calendar-week-\d/)).toHaveLength(2);
    await waitFor(() => {
      const syncBodies = fetchMock.mock.calls
        .filter(([request]) => getFetchUrl(request).includes("/daylogs:sync"))
        .map(([, init]) => JSON.parse(init!.body as string));
      expect(syncBodies).toEqual(
        expect.arrayContaining([expect.objectContaining({ startDate: "2026-08-30", endDate: "2026-09-12" })]),
      );
    });
  });
});
