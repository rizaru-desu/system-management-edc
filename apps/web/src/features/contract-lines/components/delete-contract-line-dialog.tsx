import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ContractLineRecord } from '../data/contract-lines.ts'

interface DeleteContractLineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractLine: ContractLineRecord | null
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action. */
export function DeleteContractLineDialog({
  open,
  onOpenChange,
  contractLine,
  onConfirm,
}: DeleteContractLineDialogProps) {
  if (!contractLine) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete contract line"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">
            {contractLine.name}
          </span>{' '}
          ({contractLine.id}). This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
