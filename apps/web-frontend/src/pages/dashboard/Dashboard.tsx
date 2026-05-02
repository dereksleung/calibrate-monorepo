import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { useIsLgAndAbove } from "#/shared/hooks/use-media-query.ts";
import { ConsistencyScore } from "#/verticals/dashboard/components/ConsistencyScore.tsx";
import { DayAndWeekCalories } from "#/verticals/dashboard/components/DayAndWeekCalories.tsx";
import { DayAndWeekStat } from "#/verticals/dashboard/components/DayAndWeekStat.tsx";
import { HighImpactSwap } from "#/verticals/dashboard/components/HighImpactSwap.tsx";
import { YesterdayRecap } from "#/verticals/dashboard/components/YesterdayRecap.tsx";

export const Dashboard = ({
  
}) => {
  const isLgAndAbove = useIsLgAndAbove();
  return (
    <main className="px-4 md:px-10 pb-8 pt-14 bg-surface antialiased">
      <section className="space-y-6">
        <Typography as="h2" variant="headline" color="onSurface">Daily Insights</Typography>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <HighImpactSwap />  
          <YesterdayRecap />
          <ConsistencyScore />
        </div>
      </section>
      {isLgAndAbove ? (
        <>
          <Typography as="h2" variant="headline" color="onSurface" className="mt-10">Daily & Weekly Stats</Typography>
          <section className="flex gap-8 mt-8">
            <div className="flex-1">
              <DayAndWeekCalories />
            </div>
            <div className="flex-1">
              <DayAndWeekStat title="Fats" />  
            </div>
          </section>
          <section className="flex gap-8 mt-8">
            <div className="flex-1">
              <DayAndWeekStat title="Protein" />  
            </div>
            <div className="flex-1">
              <DayAndWeekStat title="Carbs" />  
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="flex flex-col gap-4 mt-10">
            <Typography as="h2" variant="headline" color="onSurface">Daily & Weekly Stats</Typography>
            <div className="flex-1">
              <DayAndWeekCalories />
            </div>
            <div className="flex-1">
              <DayAndWeekStat title="Fats" />  
            </div>
            <div className="flex-1">
              <DayAndWeekStat title="Protein" />  
            </div>
            <div className="flex-1">
              <DayAndWeekStat title="Carbs" />  
            </div>
          </section>
        </>
      )}
    </main>
  )
}