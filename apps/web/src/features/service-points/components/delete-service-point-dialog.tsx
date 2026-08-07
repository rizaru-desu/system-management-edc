import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ServicePointRecord } from '../data/service-points.ts'

interface DeleteServicePointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servicePoint: ServicePointRecord | null
  /**
   * Live service points below the record. Deleting is blocked while any
   * exist — the backend refuses it to keep the hierarchy intact.
   */
  descendantCount: number
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action (soft delete). */
export function DeleteServicePointDialog({
  open,
  onOpenChange,
  servicePoint,
  descendantCount,
  onConfirm,
}: DeleteServicePointDialogProps) {
  if (!servicePoint) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete service point"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">
            {servicePoint.name}
          </span>{' '}
          ({servicePoint.code}). This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      confirmDisabled={descendantCount > 0}
      onConfirm={onConfirm}
    >
      {descendantCount > 0 ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          This service point has {descendantCount}{' '}
          {descendantCount === 1 ? 'service point' : 'service points'} nested
          under it — move or delete those first; deleting a service point with
          children is not allowed.
        </p>
      ) : undefined}
    </ConfirmModal>
  )
}
