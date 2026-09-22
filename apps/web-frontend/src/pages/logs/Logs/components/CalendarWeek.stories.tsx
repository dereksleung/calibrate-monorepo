import type { DayLog } from "@calibrate/frontend-core/verticals/day-logs/models/day-log";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";

import { useSyncDayLogsForDateRange } from "#/pages/dashboard/DashboardV2/useSyncDayLogsForDateRange.ts";
import { createQueryClient } from "#/shared/api/query-client.ts";
import { dayLogSlotQueryKey } from "#/verticals/day-log-cache/day-log-cache.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { mocked } from "storybook/test";

import "../../../../styles.css";
import { CalendarWeek } from "./CalendarWeek.tsx";

type CalendarDay = {
  date: string;
  dayLog: DayLog | null;
};

type CalendarWeekStoryProps = ComponentProps<typeof CalendarWeek> & {
  calendarDays: CalendarDay[];
};

const accountId = "storybook-account";
const todayDate = "2026-09-15";

function createCalendarDays(
  startDate: string,
  days: number,
  loggedDates: Record<string, number>,
): CalendarDay[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + index);
    const isoDate = date.toISOString().slice(0, 10);
    const calories = loggedDates[isoDate];

    return {
      date: isoDate,
      dayLog:
        calories === undefined
          ? null
          : {
              id: `day-log-${isoDate}`,
              date: isoDate,
              breakfast: [
                {
                  id: `entry-${isoDate}`,
                  name: "Storybook meal",
                  brand: null,
                  calories,
                  totalFatGrams: 0,
                  saturatedFatGrams: null,
                  cholesterolMg: null,
                  sodiumMg: 0,
                  totalCarbohydrateGrams: 0,
                  fiberGrams: null,
                  sugarGrams: null,
                  proteinGrams: 0,
                  chosenQuantity: 1,
                  chosenUnit: "serving",
                  quantityServing: 1,
                  servingLabel: "serving",
                  quantityMass: null,
                  massUnit: null,
                  quantityVolume: null,
                  volumeUnit: null,
                  meal: "BREAKFAST",
                },
              ],
              lunch: [],
              dinner: [],
              snacks: [],
              weight: null,
            },
    };
  });
}

const calendarDays = createCalendarDays("2026-09-06", 14, {
  "2026-09-06": 450,
  "2026-09-08": 1800,
  "2026-09-10": 2160,
  "2026-09-13": 900,
  "2026-09-14": 1350,
});

function CalendarWeekStory({ calendarDays, ...props }: CalendarWeekStoryProps) {
  const queryClient = useMemo(() => {
    const client = createQueryClient();

    for (const { date, dayLog } of calendarDays) {
      client.setQueryData(dayLogSlotQueryKey(props.accountId, date), dayLog);
    }

    return client;
  }, [calendarDays, props.accountId]);
  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: () => <CalendarWeek {...props} />,
    });

    return createRouter({
      history: createMemoryHistory({ initialEntries: ["/logs"] }),
      routeTree: rootRoute,
    });
  }, [props]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const meta = {
  title: "Logs / Calendar Week",
  component: CalendarWeekStory,
  parameters: { layout: "padded" },
  args: {
    accountId,
    calendarDays,
    selectedDate: todayDate,
    todayDate,
  },
  beforeEach: () => {
    mocked(useSyncDayLogsForDateRange).mockReturnValue({
      cached: [],
      syncResponse: undefined as never,
    });
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[32rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CalendarWeekStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TodayWithUpcomingDays: Story = {};

export const PreviousWeek: Story = {
  args: {
    selectedDate: "2026-09-10",
  },
};

export const EmptyCurrentWeek: Story = {
  args: {
    calendarDays: createCalendarDays("2026-09-13", 7, {}),
  },
};
