import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { ConsistencyScore } from "#/verticals/dashboard/components/ConsistencyScore.tsx";
import { HighImpactSwap } from "#/verticals/dashboard/components/HighImpactSwap.tsx";
import { YesterdayRecap } from "#/verticals/dashboard/components/YesterdayRecap.tsx";

export const Dashboard = ({
  
}) => {
  return (
    <main className="px-4 pb-8 pt-14 bg-surface antialiased">
      <section className="space-y-6">
        <Typography as="h2" variant="headline" color="onSurface">Daily Insights</Typography>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <YesterdayRecap />
          <HighImpactSwap />  
          <ConsistencyScore />
        </div>
      </section>
    </main>
  )
}