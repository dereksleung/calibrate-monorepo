import { useMemo, useState } from 'react'

import { DateStepper } from './components/DateStepper.tsx'
import { DailySummary } from './components/DailySummary.tsx'
import { MealSection } from './components/MealSection.tsx'
import { QuickLogDrawer } from './components/QuickLogDrawer.tsx'
import { logPageFixtures } from './log-page-fixtures.ts'
import {
  MEAL_SECTIONS,
  getDailyProgress,
  getDailyTotals,
  normalizeDayLogForRender,
} from './log-page-helpers.ts'

type LogsProps = {
  selectedDate: string
}

export function Logs({ selectedDate }: LogsProps) {
  const [quickLogMessage, setQuickLogMessage] = useState<string | null>(null)
  const dayLog = useMemo(
    () =>
      normalizeDayLogForRender(
        {
          ...logPageFixtures.normal.dayLog,
          date: new Date(`${selectedDate}T00:00:00`),
        },
        selectedDate
      ),
    [selectedDate]
  )
  const totals = getDailyTotals(dayLog)
  const progress = getDailyProgress(totals)

  return (
    <main className="min-h-screen bg-surface px-6 pb-24 pt-8 antialiased md:px-10 md:pb-20 md:pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 md:gap-9">
        <DateStepper selectedDate={selectedDate} date={dayLog.date} />
        <DailySummary totals={totals} progress={progress} weight={dayLog.weight} />

        <div className="space-y-10 md:space-y-8">
          {MEAL_SECTIONS.map((section) => (
            <MealSection
              key={section.meal}
              meal={section.meal}
              title={section.title}
              entries={dayLog.meals[section.meal]}
              onAddFood={() => setQuickLogMessage(`Search will open for ${section.title}.`)}
            />
          ))}
        </div>

        {quickLogMessage ? (
          <p role="status" className="sr-only">
            {quickLogMessage}
          </p>
        ) : null}
      </div>
      <QuickLogDrawer onSearchFood={() => setQuickLogMessage('Search food selected.')} />
    </main>
  )
}
