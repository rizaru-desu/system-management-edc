import { createFileRoute } from '@tanstack/react-router'

import { TerminalsPage } from '#/features/terminals/index.ts'

/**
 * Terminals module (Terminal Lifecycle). A static route, so it wins over
 * the `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/terminals/')({
  head: () => ({
    meta: [{ title: 'Terminals — EDC Management' }],
  }),
  component: TerminalsPage,
})
