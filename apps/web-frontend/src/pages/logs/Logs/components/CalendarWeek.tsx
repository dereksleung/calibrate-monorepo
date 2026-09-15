import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DAILY_TARGETS, addDaysToIsoDate } from "../../log-page-helpers.ts";

type CalendarWeekDay = { date: string; fillRatio: number; selected: boolean };
type CalendarWeekProps = {
  getDay: (date: string) => CalendarWeekDay;
  selectedWeekStart: string;
  todayDate: string;
  viewedWeekStart: string;
  onViewedWeekChange: (weekStart: string) => void;
};

const WEEK_COUNT = 10_000;
const FALLBACK_WEEK_WIDTH = 640;
const WEEK_MS = 7 * 86_400_000;

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
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const clampedRatio = Math.min(Math.max(fillRatio, 0), 1);
  return (
    <svg aria-hidden="true" className="size-12" viewBox="0 0 48 48">
      <circle
        cx="24"
        cy="24"
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeWidth="4"
      />
      <circle
        className="progress-ring-circle"
        cx="24"
        cy="24"
        data-dotted={dotted || undefined}
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeDasharray={dotted ? "2 3" : circumference}
        strokeDashoffset={dotted ? 0 : circumference * (1 - clampedRatio)}
        strokeLinecap="round"
        strokeWidth="4"
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
  const className = `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors ${upcoming ? "cursor-default text-on-surface-variant/35" : day.selected ? "bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" : "text-on-surface-variant hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"}`;
  const calories = Math.round(day.fillRatio * DAILY_TARGETS.calories);
  const ariaLabel = `${formatDate(day.date)}, ${calories.toLocaleString()} of ${DAILY_TARGETS.calories.toLocaleString()} calories${upcoming ? ", upcoming" : ""}`;
  const content = (
    <>
      <span className="text-xs font-semibold leading-none">
        {formatDayLabel(day.date, showWeekdayLabels)}
      </span>
      <CalorieRing dotted={isSelectedToday && day.fillRatio === 0} fillRatio={day.fillRatio} />
      <span className="min-h-4 text-[0.625rem] font-semibold leading-4">
        {isSelectedToday ? "Today" : ""}
      </span>
    </>
  );
  return upcoming ? (
    <div aria-label={ariaLabel} className={className}>
      {content}
    </div>
  ) : (
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

export function CalendarWeek({
  getDay,
  selectedWeekStart,
  todayDate,
  viewedWeekStart,
  onViewedWeekChange,
}: CalendarWeekProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [weekWidth, setWeekWidth] = useState(FALLBACK_WEEK_WIDTH);
  const todayWeekStart = getWeekStart(todayDate);
  const indexFor = (weekStart: string) =>
    Math.max(
      0,
      Math.round(
        (new Date(`${todayWeekStart}T00:00:00`).getTime() - new Date(`${weekStart}T00:00:00`).getTime()) /
          WEEK_MS,
      ),
    );
  const viewedIndex = indexFor(viewedWeekStart);
  const virtualizer = useVirtualizer({
    count: WEEK_COUNT,
    getScrollElement: () => scrollRef.current,
    horizontal: true,
    estimateSize: () => weekWidth,
    initialRect: { width: FALLBACK_WEEK_WIDTH, height: 96 },
    overscan: 1,
  });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const resize = () => {
      const viewportWidth = element.clientWidth || FALLBACK_WEEK_WIDTH;
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      setWeekWidth(isDesktop ? viewportWidth : viewportWidth - 24);
    };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    virtualizer.scrollToIndex(indexFor(selectedWeekStart), { align: "start" });
  }, [selectedWeekStart, virtualizer]);

  function snapTo(index: number) {
    const clampedIndex = Math.max(0, index);
    onViewedWeekChange(addDaysToIsoDate(todayWeekStart, -clampedIndex * 7));
    virtualizer.scrollToIndex(clampedIndex, { align: "start", behavior: "smooth" });
  }

  function handleScrollEnd() {
    snapTo(Math.max(0, Math.round((scrollRef.current?.scrollLeft ?? 0) / weekWidth)));
  }

  function handleScroll() {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(handleScrollEnd, 120);
  }

  const visibleItems = [viewedIndex, viewedIndex + 1].map((index) => ({
    index,
    key: index,
    size: weekWidth,
    start: index * weekWidth,
  }));
  return (
    <div className="flex items-center gap-1 md:gap-3">
      <button
        aria-label="Previous week"
        className="hidden size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container md:flex"
        onClick={() => snapTo(viewedIndex + 1)}
        type="button"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <div aria-label="Calendar weeks" className="min-w-0 flex-1" role="region">
        <div
          className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory"
          data-testid="calendar-week-scroller"
          onScroll={handleScroll}
          onScrollEnd={handleScrollEnd}
          ref={scrollRef}
        >
          <div className="relative h-[88px]" style={{ width: `${virtualizer.getTotalSize()}px` }}>
            {visibleItems.map((item) => {
              const weekStart = addDaysToIsoDate(todayWeekStart, -item.index * 7);
              const days = Array.from({ length: 7 }, (_, index) =>
                getDay(addDaysToIsoDate(weekStart, index)),
              );
              const showWeekdayLabels = days.some((day) => day.date === todayDate);
              return (
                <ol
                  aria-label="Calendar week"
                  className="absolute grid h-[88px] grid-cols-7 gap-1 snap-start sm:gap-2"
                  data-testid={`calendar-week-${weekStart}`}
                  key={item.key}
                  role="list"
                  style={{ transform: `translateX(${item.start}px)`, width: `${item.size}px` }}
                >
                  {days.map((day) => (
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
      </div>
      <button
        aria-label="Next week"
        className="hidden size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:cursor-default disabled:opacity-35 md:flex"
        disabled={viewedIndex === 0}
        onClick={() => snapTo(viewedIndex - 1)}
        type="button"
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </div>
  );
}
