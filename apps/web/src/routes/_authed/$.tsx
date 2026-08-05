import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '#/features/console/index.ts'

/**
 * Catch-all for console modules that only exist in the sidebar blueprint so
 * far (terminals, merchants, job orders, …). Renders the sample's
 * "coming up next" placeholder until each module gets a real route.
 */
export const Route = createFileRoute('/_authed/$')({
  head: () => ({
    meta: [{ title: 'EDC Management' }],
  }),
  component: PlaceholderPage,
})
