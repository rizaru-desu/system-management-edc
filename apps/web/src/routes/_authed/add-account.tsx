import { createFileRoute } from '@tanstack/react-router'

import { AddAccountPage } from '#/features/accounts/index.ts'

/**
 * Add Account module (Master Data). A static route, so it wins over the `$`
 * catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/add-account')({
  head: () => ({
    meta: [{ title: 'Add Account — EDC Management' }],
  }),
  component: AddAccountPage,
})
