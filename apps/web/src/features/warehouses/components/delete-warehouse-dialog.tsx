import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { WarehouseRecord } from '../data/warehouses.ts'

interface DeleteWarehouseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse: WarehouseRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Delete action. The backend still
 * refuses the delete while child warehouses exist — that message surfaces
 * as a toast.
 */
export function DeleteWarehouseDialog({
  open,
  onOpenChange,
  warehouse,
  onConfirm,
}: DeleteWarehouseDialogProps) {
  if (!warehouse) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete warehouse"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">{warehouse.name}</span>{' '}
          ({warehouse.code}). Stock and terminal history referencing it stays
          intact, but the warehouse disappears from the hierarchy.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
