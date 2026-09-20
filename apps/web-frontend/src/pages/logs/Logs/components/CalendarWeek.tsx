import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { DAILY_TARGETS, addDaysToIsoDate, type CalendarWeekGroup } from "../../log-page-helpers.ts";

type CalendarWeekDay = { date: string; fillRatio: number; selected: boolean };
type CalendarWeekProps = {
  weeks: CalendarWeekGroup[];
  selectedWeekStart: string;
  todayDate: string;
  viewedWeekStart: string;
  onViewedWeekChange: (weekStart: string) => void;
};


function getWeekStart(date: string) {
  return addDaysToIsoDate(date, -new Date(`${date}T00:00:00`).getDay());
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
    <svg aria-hidden="true" className="size-[1.125rem]" viewBox="0 0 24 24">
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
        className="progress-ring-circle origin-center -rotate-90"
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
  const isSelectedToday = day.selected && day.date === todayDate;
  const dotted = day.date === todayDate && day.fillRatio === 0;
  const label = formatDayLabel(day.date, showWeekdayLabels);
  const content = (
    <>
      <span aria-hidden="true" className="flex h-2 items-center justify-center">
        {isSelectedToday ? <span className="size-1 rounded-full bg-current" /> : null}
      </span>
      <span className="text-sm font-medium leading-none">{label}</span>
      <CalorieRing dotted={dotted} fillRatio={day.fillRatio} />
    </>
  );
  const className = `flex min-w-0 flex-col items-center gap-2 px-1 py-1.5 transition-colors ${upcoming
    ? "cursor-default text-on-surface-variant/40"
    : day.selected
      ? "text-on-surface"
      : "text-on-surface-variant hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

export function useHorizontalScrollAnchor<T>(dependencies: T, containerRef: React.RefObject<HTMLDivElement | null>) {
  // const containerRef = useRef<HTMLDivElement | null>(null);
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

    // If items were prepended, currentScrollWidth will be larger
    if (prevScrollWidth > 0 && currentScrollWidth > prevScrollWidth) {
      const widthDifference = currentScrollWidth - prevScrollWidth;

      // Shift the scrollLeft forward by exactly how much width was added to the start
      requestAnimationFrame(() => {
        container.scrollLeft += widthDifference;
      })
    }
  }, [dependencies]); // Triggers when data/items change

  return containerRef;
}

export function CalendarWeek({
  weeks,
  selectedWeekStart,
  todayDate,
  onViewedWeekChange,
}: CalendarWeekProps) {
  console.log("🚀 ~ CalendarWeek ~ weeks:", weeks)
  const viewportRef = useRef<HTMLDivElement>(null);
  const todayWeekStart = getWeekStart(todayDate);
  const [activeWeekStart, setActiveWeekStart] = useState<string | null>(null);

  const weekNodesRef = useRef(new Map<string, HTMLOListElement>());
  const scrollToItem = (id: string) => {
    const viewport = viewportRef.current;
    const node = weekNodesRef.current.get(id);
    if (!viewport || !node) return;

    const left =
      node.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft;

    // viewport.scrollTo({
    //   behavior: "smooth",
    //   left,
    // });
    node.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest'
    })
  };

  useHorizontalScrollAnchor(weeks, viewportRef);

  useEffect(() => {
    scrollToItem(selectedWeekStart);
  }, [])

  useEffect(() => {
    if (!viewportRef.current) return;
    // 1. Create the observer instance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            setActiveWeekStart(id);
            if (id) {
              onViewedWeekChange(id);
            }
          }
        });
      },
      {
        root: viewportRef.current,
        rootMargin: '0px',
        threshold: 0.6,
      }
    );

    // 2. Start observing all the current DOM nodes in our Map
    weekNodesRef.current.forEach((node) => {
      observer.observe(node);
    });

    // 3. Clean up the observer when items change or component unmounts
    return () => {
      observer.disconnect();
    };
  }, [weeks, viewportRef.current]);


  useLayoutEffect(() => {
    if (!viewportRef.current) return;
    const viewportWidth = viewportRef.current.clientWidth;
    setWeekWidth(viewportWidth);
  }, [viewportRef.current])


  return (
    <div className="flex items-center gap-1 md:gap-3">
      <button
        aria-label="Previous week"
        className="hidden size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant md:flex"
        onClick={() => {
          const prevWeekStart = addDaysToIsoDate(activeWeekStart!, -7);
          console.log("onClick | prevWeekStart:", prevWeekStart)
          scrollToItem(prevWeekStart);
          // onViewedWeekChange(prevWeekStart);
        }}
        type="button"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <div aria-label="Calendar weeks" className="min-w-0 flex-1" role="region">
        <div
          // className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-[88px] overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory overflow-y-hidden"
          className="flex w-full flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-[88px] overflow-x-auto overscroll-x-contain snap-x snap-mandatory overflow-y-hidden"
          data-testid="calendar-week-scroller"
          ref={viewportRef}
        >
          {weeks.map((week) => {
            const { weekStart } = week;
            const showWeekdayLabels = weekStart === todayWeekStart;

            return (
              <ol
                aria-label="Calendar week"
                className="grid h-[88px] w-full min-w-full shrink-0 basis-full grid-cols-7 gap-1 snap-start snap-always"
                data-testid={`calendar-week-${weekStart}`}
                id={weekStart}
                key={weekStart}
                role="list"
                ref={(node) => {
                  const map = weekNodesRef.current;
                  if (node) {
                    map.set(weekStart, node);
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
        {/* </div> */}
      </div>
      <button
        aria-label="Next week"
        className="hidden size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:cursor-default disabled:opacity-35 md:flex"
        // disabled={isInitialVirtualizedList || indexes[indexes.length - 2] >= weeks.length - 1}
        onClick={() => {
          const nextWeekStart = addDaysToIsoDate(activeWeekStart!, 7);
          scrollToItem(nextWeekStart);
        }}
        type="button"
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </div>
  );
}
