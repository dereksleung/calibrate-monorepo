import { useRef } from "react";
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

  // Used for handlers on mobile-sized desktop browsers, without which you cannot drag the Daily Insights row to scroll it horizontally.
  // Mobile browsers don't have this issue because they handle touch dragging for scrolling by default, but desktop browsers require these handlers to be added to enable dragging with the mouse.
  // It might seem buggy otherwise if you are trying it out in a desktop browser, resized to mobile screens, without using the responsive design mode.
  const insightsScrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    scrollLeft: 0,
  });

  return (
    <main className="px-4 md:px-10 pb-8 pt-14 bg-surface antialiased">
      <section className="space-y-6">
        <Typography as="h2" variant="headline" color="onSurface">Daily Insights</Typography>
        <div
          ref={insightsScrollerRef}
          className="grid cursor-grab auto-cols-[75%] grid-flow-col items-stretch gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden md:cursor-auto md:grid-flow-row md:grid-cols-3 md:auto-cols-auto md:gap-8 md:overflow-visible md:pb-0"
          // Without the next few handlers on mobile-sized desktop browsers, you cannot drag the Daily Insights row to scroll it horizontally.
          // Mobile browsers don't have this issue because they handle touch dragging for scrolling by default, but desktop browsers require these handlers to be added to enable dragging with the mouse.
          // It might seem buggy otherwise if you are trying it out in a desktop browser without using the responsive design mode.
          onClickCapture={(event) => {
            if (!dragStateRef.current.hasMoved) return;

            event.preventDefault();
            event.stopPropagation();
            dragStateRef.current.hasMoved = false;
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "touch") return;

            dragStateRef.current = {
              isDragging: true,
              hasMoved: false,
              startX: event.clientX,
              scrollLeft: insightsScrollerRef.current?.scrollLeft ?? 0,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const scroller = insightsScrollerRef.current;
            const dragState = dragStateRef.current;

            if (!dragState.isDragging || !scroller) return;

            const dragDistance = event.clientX - dragState.startX;

            if (Math.abs(dragDistance) > 4) {
              dragState.hasMoved = true;
            }

            scroller.scrollLeft = dragState.scrollLeft - dragDistance;
          }}
          onPointerUp={(event) => {
            dragStateRef.current.isDragging = false;

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
        >
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
