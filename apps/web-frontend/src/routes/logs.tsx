import { createFileRoute } from '@tanstack/react-router'

import { Logs } from '#/pages/logs/Logs.tsx'
import { normalizeLogsSearch } from '#/pages/logs/log-page-helpers.ts'

export const Route = createFileRoute('/logs')({
  validateSearch: normalizeLogsSearch,
  component: LogsRoute,
})

function LogsRoute() {
  const { date } = Route.useSearch()

  return <Logs selectedDate={date} />
}
