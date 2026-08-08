import { createFileRoute } from '@tanstack/react-router'

import { ProjectsPage } from '#/features/projects/index.ts'

/**
 * Projects module (Contract Management). A static route, so it wins over
 * the `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/projects')({
  head: () => ({
    meta: [{ title: 'Projects — EDC Management' }],
  }),
  component: ProjectsPage,
})
