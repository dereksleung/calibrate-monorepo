import { createFileRoute } from '@tanstack/react-router'

import { Logs } from '#/pages/logs/Logs.tsx'

export const Route = createFileRoute('/logs')({
  component: Logs,
})
