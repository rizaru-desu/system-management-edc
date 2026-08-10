import { createFileRoute } from '@tanstack/react-router'

import { ItemCategoriesPage } from '#/features/item-categories/index.ts'

/**
 * Item Categories module (Administration). A static route, so it wins over
 * the `$` catch-all that still serves the not-yet-built console modules.
 */
export const Route = createFileRoute('/_authed/item-categories')({
  head: () => ({
    meta: [{ title: 'Item Categories — EDC Management' }],
  }),
  component: ItemCategoriesPage,
})
