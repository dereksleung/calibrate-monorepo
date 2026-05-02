import { Typography } from '#/shared/components/base/typography/Typography.tsx'

export function Goals() {
  return (
    <main className="bg-surface px-4 pb-8 pt-14 antialiased md:px-10">
      <Typography as="h1" variant="headline" color="onSurface">
        Goals
      </Typography>
      <p className="mt-4 text-muted-foreground">Nutrition and wellness goals will appear here.</p>
    </main>
  )
}
