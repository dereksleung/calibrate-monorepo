import { Link } from "@tanstack/react-router";

import { DAILY_TARGETS } from "../../log-page-helpers.ts";

type CalendarWeekDay = {
  date: string;
  fillRatio: number;
  selected: boolean;
};

type CalendarWeekProps = {
  days: CalendarWeekDay[];
  todayDate: string;
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
  const dotted = isSelectedToday && day.fillRatio === 0;
  const label = formatDayLabel(day.date, showWeekdayLabels);
  const content = (
    <>
      <span className="text-xs font-semibold leading-none">{label}</span>
      <CalorieRing dotted={dotted} fillRatio={day.fillRatio} />
      <span className="min-h-4 text-[0.625rem] font-semibold leading-4">
        {isSelectedToday ? "Today" : ""}
      </span>
    </>
  );
  const className = `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors ${
    upcoming
      ? "cursor-default text-on-surface-variant/35"
      : day.selected
        ? "bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        : "text-on-surface-variant hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

export function CalendarWeek({ days, todayDate }: CalendarWeekProps) {
  const showWeekdayLabels = days.some((day) => day.date === todayDate);

  return (
    <ol aria-label="Calendar week" className="grid grid-cols-7 gap-1 sm:gap-2" role="list">
      {days.map((day) => (
        <li key={day.date}>
          <CalendarWeekDayCell day={day} showWeekdayLabels={showWeekdayLabels} todayDate={todayDate} />
        </li>
      ))}
    </ol>
  );
}
