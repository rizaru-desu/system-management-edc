import { createFileRoute } from '@tanstack/react-router'

import { FieldEngineersPage } from '#/features/field-engineers/index.ts'

/**
 * Field Engineers module (Service Operations). A static route, so it wins
 * over the `$` catch-all that still serves the not-yet-built console
 * modules.
 */
export const Route = createFileRoute('/_authed/engineers/')({
  head: () => ({
    meta: [{ title: 'Field Engineers — EDC Management' }],
  }),
  component: FieldEngineersPage,
})
