import { Card } from "#/shared/components/base/Card.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#/shared/components/base/drawer.tsx";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { useIsMobile } from "#/shared/hooks/use-media-query.ts";
import { cn } from "#/lib/utils";
import { ArrowLeftRight, EyeOff, Lightbulb, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const smartSwaps = [
  "Swap whole milk for almond milk in your coffee to save 50cal.",
  "Replace mayo with Greek yogurt in your sandwich for 90cal savings.",
];

type TipCardProps = {
  children: ReactNode;
  className?: string;
};

export const SmartSwap = ({ children, className }: TipCardProps) => (
  <div
    className={cn(
      "rounded-3xl border-l-4 border-primary bg-card px-5 py-4 shadow-sm",
      className,
    )}
  >
    <Typography as="p" color="onSurface" className="text-lg leading-7">
      {children}
    </Typography>
  </div>
);

export const HiddenContributor = ({ children, className }: TipCardProps) => (
  <div
    className={cn(
      "rounded-3xl border border-outline-variant bg-surface-container-low px-6 py-5 shadow-sm",
      className,
    )}
  >
    <Typography as="p" color="onSurface" className="text-lg leading-8 italic">
      {children}
    </Typography>
  </div>
);

export const PrimaryBgTipCard = ({ children, className }: TipCardProps) => (
  <div
    className={cn(
      "relative flex flex-col gap-14 rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-container p-6 text-primary-foreground shadow-lg after:absolute after:inset-0",
      className,
    )}
  >
    <Sparkles className="size-5" />
    <Typography
      as="p"
      color="inherit"
      weight="bold"
      className="text-base leading-6"
    >
      {children}
    </Typography>
  </div>
);

export const HighImpactSwap = () => {
  const isMobile = useIsMobile();
  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <Card className="rounded-radius-sm p-4 lg:p-8 gap-4">
        <div className="flex gap-3 text-primary">
          <ArrowLeftRight className="mt-1" />
          <Typography
            as="h3"
            variant="bodyLg"
            color="primary"
            weight="semibold"
            className="self-start"
          >
            High-Impact Swap
          </Typography>
        </div>
        {/* TODO: Make text dynamic.
          Just showing judgment presenting the most important metrics and data for a normal user trying to stay on track
          with new habits and weight loss for now. */}
        <Typography as="p" color="onSurfaceVariant" size="sm" weight="light">
          Reducing your snack almonds by 20g would save 80cal.
        </Typography>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="mt-auto flex cursor-pointer items-center gap-2 pt-4 text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <Typography as="span" color="primary" weight="medium" size="sm">
              Learn More
            </Typography>
            <Lightbulb className="size-4 text-primary" />
          </button>
        </DrawerTrigger>
      </Card>
      <DrawerContent>
        <DrawerHeader className="gap-2 px-6 pt-8 pb-4 text-left">
          <DrawerTitle className="font-heading text-3xl font-normal text-primary">
            High-Impact Tips
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Personalized guidance based on your recent logs.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-9 overflow-y-auto px-6 pb-8">
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-primary">
              <ArrowLeftRight className="size-5" />
              <Typography
                as="h3"
                variant="label"
                color="primary"
                weight="bold"
                className="tracking-[0.18em]"
              >
                Smart Swaps
              </Typography>
            </div>

            <div className="flex flex-col gap-4">
              {smartSwaps.map((swap) => (
                <SmartSwap key={swap}>{swap}</SmartSwap>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-on-surface">
              <EyeOff className="size-5" />
              <Typography
                as="h3"
                variant="label"
                color="onSurface"
                weight="bold"
                className="tracking-[0.18em]"
              >
                Hidden Contributors
              </Typography>
            </div>

            <HiddenContributor>
              "Cooking oils and dressings added an average of{" "}
              <span className="font-bold">250kcal</span> to your dinners this
              week."
            </HiddenContributor>
          </section>

          <PrimaryBgTipCard>
            Tip: Using an oil sprayer can reduce fat intake by up to 15g per
            meal.
          </PrimaryBgTipCard>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
