import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ItemCategoryRecord } from '../data/item-categories.ts'

interface DeleteItemCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ItemCategoryRecord | null
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action. */
export function DeleteItemCategoryDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: DeleteItemCategoryDialogProps) {
  if (!item) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete item"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">{item.name}</span>
          {item.code ? ` (${item.code})` : ''}. Products referencing it keep
          their history, but the item disappears from the catalogue.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
