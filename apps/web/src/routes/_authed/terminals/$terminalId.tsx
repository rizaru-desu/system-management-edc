import { createFileRoute } from '@tanstack/react-router'

import { TerminalDetailPage } from '#/features/terminals/index.ts'

/** Detail view of one terminal (Terminal Lifecycle → Terminals → detail). */
export const Route = createFileRoute('/_authed/terminals/$terminalId')({
  head: () => ({
    meta: [{ title: 'Terminal Detail — EDC Management' }],
  }),
  component: TerminalDetailRoute,
})

function TerminalDetailRoute() {
  const { terminalId } = Route.useParams()
  return <TerminalDetailPage terminalId={terminalId} />
}
