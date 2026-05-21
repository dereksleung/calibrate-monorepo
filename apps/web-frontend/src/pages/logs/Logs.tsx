import { Typography } from '#/shared/components/base/typography/Typography.tsx'

type LogsProps = {
  selectedDate: string
}

export function Logs({ selectedDate }: LogsProps) {
  return (
    <main className="bg-surface px-4 pb-8 pt-14 antialiased md:px-10">
      <Typography as="h1" variant="headline" color="onSurface">
        Logs
      </Typography>
      <p className="mt-4 text-muted-foreground">Food and activity logs for {selectedDate} will appear here.</p>
    </main>
  )
}
