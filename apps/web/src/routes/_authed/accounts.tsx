import { createFileRoute } from '@tanstack/react-router'

import { AccountsPage } from '#/features/accounts/index.ts'

/**
 * Account module (Contract Management). A static route, so it wins over the
 * `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/accounts')({
  head: () => ({
    meta: [{ title: 'Accounts — EDC Management' }],
  }),
  component: AccountsPage,
})
