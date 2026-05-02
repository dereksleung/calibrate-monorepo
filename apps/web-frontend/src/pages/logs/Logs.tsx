import { Typography } from '#/shared/components/base/typography/Typography.tsx'

export function Logs() {
  return (
    <main className="bg-surface px-4 pb-8 pt-14 antialiased md:px-10">
      <Typography as="h1" variant="headline" color="onSurface">
        Logs
      </Typography>
      <p className="mt-4 text-muted-foreground">Food and activity logs will appear here.</p>
    </main>
  )
}
