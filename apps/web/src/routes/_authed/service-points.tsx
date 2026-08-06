import { createFileRoute } from '@tanstack/react-router'

import { ServicePointsPage } from '#/features/service-points/index.ts'

/**
 * Service Point module (Administration). A static route, so it wins over the
 * `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/service-points')({
  head: () => ({
    meta: [{ title: 'Service Point — EDC Management' }],
  }),
  component: ServicePointsPage,
})
