import { Card } from "#/shared/components/base/Card.tsx";
import { Typography } from "#/shared/components/base/typography/Typography.tsx";
import { ArrowLeftRight, Lightbulb } from 'lucide-react';

export const HighImpactSwap = () => {
  return (
    <Card className="rounded-radius-sm p-8 gap-4">
      <div className="flex gap-3 text-primary">
        <ArrowLeftRight className="mt-1"/>
        <h3 className="font-semibold text-lg">High-Impact Swap</h3>
      </div>
      {/* TODO: Make text dynamic. 
      Just showing judgment presenting the most important metrics and data for a normal user trying to stay on track 
      with new habits and weight loss for now. */}
      <Typography as="p" color="onSurface">
        Reducing your snack almonds by 20g would save 80cal.
      </Typography>
      <div className="mt-auto pt-4 flex items-center gap-2 cursor-pointer hover:underline">
        <Typography as="span" color="primary" weight="medium" size="sm">
          Learn More
        </Typography>
        <Lightbulb className="text-primary" size={15} />
      </div>
    </Card>  
  )
};