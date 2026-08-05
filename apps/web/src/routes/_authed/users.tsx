import { createFileRoute } from '@tanstack/react-router'

import { UsersPage } from '#/features/users/index.ts'

/**
 * Users & Roles module (Administration). A static route, so it wins over the
 * `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/users')({
  head: () => ({
    meta: [{ title: 'Users & Roles — EDC Management' }],
  }),
  component: UsersPage,
})
