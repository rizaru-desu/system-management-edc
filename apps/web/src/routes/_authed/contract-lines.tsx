import { createFileRoute } from '@tanstack/react-router'

import { ContractLinesPage } from '#/features/contract-lines/index.ts'

/**
 * Contract Lines module (Contract Management). A static route, so it wins
 * over the `$` catch-all that still serves the not-yet-built console
 * modules.
 */
export const Route = createFileRoute('/_authed/contract-lines')({
  head: () => ({
    meta: [{ title: 'Contract Lines — EDC Management' }],
  }),
  component: ContractLinesPage,
})
