import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ProductRecord } from '../data/products.ts'

/** Confirmation dialog for the table's Delete action. */
export function DeleteProductDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductRecord | null
  onConfirm: () => void
}) {
  if (!product) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete product"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">
            {product.modelName}
          </span>{' '}
          ({product.brand}). Terminal history referencing it stays intact, but
          the model disappears from the catalogue.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
