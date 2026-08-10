import { createFileRoute } from '@tanstack/react-router'

import { ProductDetailPage } from '#/features/products/index.ts'

/** Create flow of the product detail page (static, so it beats $productId). */
export const Route = createFileRoute('/_authed/products/new')({
  head: () => ({
    meta: [{ title: 'New Product — EDC Management' }],
  }),
  component: NewProductRoute,
})

function NewProductRoute() {
  return <ProductDetailPage productId={null} />
}
