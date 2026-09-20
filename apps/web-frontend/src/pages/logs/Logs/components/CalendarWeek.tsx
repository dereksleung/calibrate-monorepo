import { dayLogSlotQueryKeyPrefix } from "#/verticals/day-log-cache/day-log-cache.ts";
import { useSyncDayLogsForDateRange } from "#/verticals/day-log-cache/use-sync-day-logs-for-date-range.ts";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  DAILY_TARGETS,
  addDaysToIsoDate,
  toCalendarWeeks,
  type CalendarWeekGroup,
  type DayLogCacheRecord,
} from "../../log-page-helpers.ts";

type CalendarWeekDay = { date: string; fillRatio: number; selected: boolean };
type CalendarWeekProps = {
  accountId: string;
  selectedDate: string;
  todayDate: string;
};

function getWeekStart(date: string) {
  return addDaysToIsoDate(date, -new Date(`${date}T00:00:00`).getDay());
}

function isDateInWeek(date: string, weekStart: string) {
  return date >= weekStart && date <= addDaysToIsoDate(weekStart, 6);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );
}

function formatDayLabel(date: string, showWeekdayLabels: boolean) {
  return new Intl.DateTimeFormat(
    "en-US",
    showWeekdayLabels ? { weekday: "narrow" } : { day: "numeric" },
  ).format(new Date(`${date}T00:00:00`));
}

function CalorieRing({ fillRatio, dotted }: { fillRatio: number; dotted: boolean }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const clampedRatio = Math.min(Math.max(fillRatio, 0), 1);

  return (
    <svg aria-hidden="true" className="size-[1.125rem] -rotate-90" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="2"
      />
      <circle
        className="progress-ring-circle"
        cx="12"
        cy="12"
        data-dotted={dotted || undefined}
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeDasharray={dotted ? "1.5 2.5" : circumference}
        strokeDashoffset={dotted ? 0 : circumference * (1 - clampedRatio)}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CalendarWeekDayCell({
  day,
  todayDate,
  showWeekdayLabels,
}: {
  day: CalendarWeekDay;
  todayDate: string;
  showWeekdayLabels: boolean;
}) {
  const upcoming = day.date > todayDate;
  const dotted = day.date === todayDate && day.fillRatio === 0;
  const label = formatDayLabel(day.date, showWeekdayLabels);
  const content = (
    <>
      <span aria-hidden="true" className="flex h-2 items-center justify-center">
        {day.date === todayDate ? <span className="size-1 rounded-full bg-current" /> : null}
      </span>
      <span className="text-sm font-medium leading-none">{label}</span>
      <CalorieRing dotted={dotted} fillRatio={day.fillRatio} />
    </>
  );
  const className = `flex min-w-0 flex-col items-center gap-2 px-1 py-1.5 transition-colors ${upcoming
    ? "cursor-default text-on-surface-variant/40"
    : day.selected
      ? "text-on-surface"
      : "text-on-surface-variant/60 hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    }`;
  const calories = Math.round(day.fillRatio * DAILY_TARGETS.calories);
  const ariaLabel = `${formatDate(day.date)}, ${calories.toLocaleString()} of ${DAILY_TARGETS.calories.toLocaleString()} calories${upcoming ? ", upcoming" : ""}`;

  if (upcoming) {
    return (
      <div aria-label={ariaLabel} className={className}>
        {content}
      </div>
    );
  }

  return (
    <Link
      aria-current={day.selected ? "date" : undefined}
      aria-label={ariaLabel}
      className={className}
      search={{ date: day.date }}
      to="/logs"
    >
      {content}
    </Link>
  );
}

export function useKeepScrollPositionOnPrependWeeks<T>(
  dependencies: T,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const prevScrollWidthRef = useRef<number>(0);

  // Capture the scrollWidth immediately before the layout updates
  if (containerRef.current) {
    prevScrollWidthRef.current = containerRef.current.scrollWidth;
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prevScrollWidth = prevScrollWidthRef.current;
    const currentScrollWidth = container.scrollWidth;

    if (prevScrollWidth > 0 && currentScrollWidth > prevScrollWidth) {
      const widthDifference = currentScrollWidth - prevScrollWidth;

      // Shift the scrollLeft forward by exactly how much width was added to the start
      requestAnimationFrame(() => {
        container.scrollLeft += widthDifference;
      });
    }
  }, [dependencies]);

  return containerRef;
}

export function CalendarWeek({ accountId, selectedDate, todayDate }: CalendarWeekProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const todayWeekStart = getWeekStart(todayDate);
  const selectedWeekStart = getWeekStart(selectedDate > todayDate ? todayDate : selectedDate);
  const [activeWeekStart, setActiveWeekStart] = useState(selectedWeekStart);
  const calendarWeek = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysToIsoDate(activeWeekStart, index)),
    [activeWeekStart],
  );
  const calendarRange = {
    startDate: addDaysToIsoDate(activeWeekStart, -7),
    endDate: calendarWeek.at(-1)! > todayDate ? todayDate : calendarWeek.at(-1)!,
  };
  const calendarDaySync = useSyncDayLogsForDateRange({
    accountId,
    dateRange: calendarRange,
    enabled: selectedDate <= todayDate,
  });
  const weeks = useMemo((): CalendarWeekGroup[] => {
    const allDayLogs: DayLogCacheRecord[] = queryClient
      .getQueriesData<DayLogCacheRecord["data"]>({
        queryKey: dayLogSlotQueryKeyPrefix(accountId),
      })
      .map(([key, data]) => ({ key, data }));

    return toCalendarWeeks(allDayLogs, selectedDate, todayDate);
  }, [accountId, calendarDaySync.cached, queryClient, selectedDate, todayDate]);
  const weekStartForNavigation = activeWeekStart;
  const isViewingWeekContainingToday = isDateInWeek(todayDate, weekStartForNavigation);

  const weekNodesRef = useRef(new Map<string, HTMLOListElement>());
  const scrollToItem = (id: string, behavior: ScrollBehavior) => {
    const node = weekNodesRef.current.get(id);
    if (!node) return;

    node.scrollIntoView({
      behavior,
      inline: "end",
      block: "nearest",
    });
  };

  useKeepScrollPositionOnPrependWeeks(weeks, viewportRef);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToItem(activeWeekStart, "instant");
    });
  }, []);

  const intersectionObserverRef = useRef<IntersectionObserver>(null);

  useEffect(() => {
    if (!viewportRef.current) return;
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            if (id) {
              setActiveWeekStart(id);
            }
          }
        });
      },
      {
        root: viewportRef.current,
        rootMargin: "0px",
        threshold: 0.6,
      },
    );

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [intersectionObserverRef, viewportRef.current]);

  useEffect(() => {
    if (!viewportRef.current || !intersectionObserverRef.current) return;
    weekNodesRef.current.forEach((node) => {
      intersectionObserverRef.current?.observe(node);
    });
  }, [weeks, viewportRef.current, intersectionObserverRef]);

  return (
    <div className="flex items-center gap-1 md:gap-3">
      <button
        aria-label="Previous week"
        className="hidden size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-primary/10 md:flex"
        onClick={() => {
          const prevWeekStart = addDaysToIsoDate(activeWeekStart, -7);
          // setActiveWeekStart(prevWeekStart);
          // onViewedWeekChange(prevWeekStart);
          scrollToItem(prevWeekStart, "smooth");
        }}
        type="button"
      >
        <ChevronLeft aria-hidden className="size-4 hover:text-primary" />
      </button>
      <div aria-label="Calendar weeks" className="min-w-0 flex-1" role="region">
        <div
          className="flex w-full flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto overscroll-x-contain snap-x snap-mandatory overflow-y-hidden"
          data-testid="calendar-week-scroller"
          ref={viewportRef}
        >
          {weeks.map((week) => {
            const { weekStart } = week;
            const showWeekdayLabels = weekStart === todayWeekStart;

            return (
              <ol
                aria-label="Calendar week"
                className="grid w-full min-w-full shrink-0 basis-full grid-cols-7 gap-1 snap-start snap-always"
                data-testid={`calendar-week-${weekStart}`}
                id={weekStart}
                key={weekStart}
                role="list"
                ref={(node) => {
                  const map = weekNodesRef.current;
                  if (node) {
                    map.set(weekStart, node);
                  } else {
                    map.delete(weekStart);
                  }
                }}
              >
                {week.days.map((day) => (
                  <li key={day.date}>
                    <CalendarWeekDayCell
                      day={day}
                      showWeekdayLabels={showWeekdayLabels}
                      todayDate={todayDate}
                    />
                  </li>
                ))}
              </ol>
            );
          })}
        </div>
      </div>
      <button
        aria-label="Next week"
        className="hidden size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:cursor-default disabled:opacity-35 md:flex"
        disabled={isViewingWeekContainingToday}
        onClick={() => {
          const nextWeekStart = addDaysToIsoDate(activeWeekStart, 7);
          if (nextWeekStart > todayWeekStart) return;
          // setActiveWeekStart(nextWeekStart);
          // onViewedWeekChange(nextWeekStart);
          scrollToItem(nextWeekStart, "smooth");
        }}
        type="button"
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </div>
  );
}
