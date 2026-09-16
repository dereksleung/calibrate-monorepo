import { useIsMobile } from "#/shared/hooks/use-media-query.ts";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DAILY_TARGETS } from "../../log-page-helpers.ts";

type CalendarWeekDay = {
  date: string;
  fillRatio: number;
  selected: boolean;
};

type CalendarWeekProps = {
  days: CalendarWeekDay[];
  todayDate: string;
  canShowNextWeek: boolean;
  onShowPreviousWeek: () => void;
  onShowNextWeek: () => void;
};

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
  const className = `flex min-w-0 flex-col items-center gap-1 px-1 py-1.5 transition-colors ${
    upcoming
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

export function CalendarWeek({
  days,
  todayDate,
  canShowNextWeek,
  onShowPreviousWeek,
  onShowNextWeek,
}: CalendarWeekProps) {
  const isMobile = useIsMobile();
  const showWeekdayLabels = days.some((day) => day.date === todayDate);

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {!isMobile ? (
        <button
          aria-label="Show previous week"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={onShowPreviousWeek}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.5} />
        </button>
      ) : null}
      <ol aria-label="Calendar week" className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2" role="list">
        {days.map((day) => (
          <li key={day.date}>
            <CalendarWeekDayCell day={day} showWeekdayLabels={showWeekdayLabels} todayDate={todayDate} />
          </li>
        ))}
      </ol>
      {!isMobile ? (
        <button
          aria-label="Show next week"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-on-surface-variant/25 disabled:hover:bg-transparent"
          disabled={!canShowNextWeek}
          onClick={onShowNextWeek}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}
