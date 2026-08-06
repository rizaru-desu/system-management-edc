import { createFileRoute } from '@tanstack/react-router'

import { AppReleasesPage } from '#/features/app-releases/index.ts'

/**
 * App Releases module (Administration). A static route, so it wins over the
 * `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/app-releases')({
  head: () => ({
    meta: [{ title: 'App Releases — EDC Management' }],
  }),
  component: AppReleasesPage,
})
