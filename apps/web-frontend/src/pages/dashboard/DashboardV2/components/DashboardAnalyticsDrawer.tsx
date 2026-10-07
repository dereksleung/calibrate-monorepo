import type { NutrientAnalyticsModel } from "@calibrate/frontend-core/verticals/dashboard/dashboard-v2-model";
import type { RefObject } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "#/shared/components/base/drawer.tsx";
import { useIsMobile } from "#/shared/hooks/use-media-query.ts";
import { X } from "lucide-react";

import { NutrientAnalytics } from "./NutrientAnalytics.tsx";

type DashboardAnalyticsDrawerProps = {
  model: NutrientAnalyticsModel | null;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
};

function DashboardAnalyticsDrawer({ model, onClose, returnFocusRef }: DashboardAnalyticsDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={model !== null}
    >
      <DrawerContent
        className="h-[80vh] w-full overflow-hidden border-analytics-outline/40 bg-analytics-header text-analytics-foreground data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=right]:rounded-l-lg md:h-full md:max-w-[28rem] [&>div:first-child]:bg-analytics-header-muted/30"
        overlayClassName="bg-on-tertiary-fixed/15 supports-backdrop-filter:backdrop-blur-[6px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>{model ? `${model.title} analytics` : "Nutrient analytics"}</DrawerTitle>
          <DrawerDescription>
            {model
              ? `Total ${model.title.toLowerCase()} summary and food source contributions.`
              : "Nutrient contribution details."}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerClose
          aria-label={`Close ${model?.title ?? "Nutrient"} analytics`}
          className="absolute right-3 top-4 z-10 inline-flex size-11 items-center justify-center rounded-full text-analytics-header-muted transition-colors hover:bg-analytics-header-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-analytics-header-foreground motion-reduce:transition-none"
        >
          <X aria-hidden="true" className="size-5" />
        </DrawerClose>
        {model ? <NutrientAnalytics key={model.metric} model={model} /> : null}
      </DrawerContent>
    </Drawer>
  );
}

export { DashboardAnalyticsDrawer };
export type { DashboardAnalyticsDrawerProps };
