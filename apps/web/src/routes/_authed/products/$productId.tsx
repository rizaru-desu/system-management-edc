import { createFileRoute } from '@tanstack/react-router'

import { ProductDetailPage } from '#/features/products/index.ts'

/** Edit view of one product (Terminal Lifecycle → Products → detail). */
export const Route = createFileRoute('/_authed/products/$productId')({
  head: () => ({
    meta: [{ title: 'Product Detail — EDC Management' }],
  }),
  component: ProductDetailRoute,
})

function ProductDetailRoute() {
  const { productId } = Route.useParams()
  return <ProductDetailPage productId={productId} />
}
