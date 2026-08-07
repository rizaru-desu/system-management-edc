import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { MerchantRecord } from '../data/merchants.ts'

interface DeleteMerchantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchant: MerchantRecord | null
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action. */
export function DeleteMerchantDialog({
  open,
  onOpenChange,
  merchant,
  onConfirm,
}: DeleteMerchantDialogProps) {
  if (!merchant) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete merchant"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">{merchant.name}</span>{' '}
          ({merchant.code}). This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
