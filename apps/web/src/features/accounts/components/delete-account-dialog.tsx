import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { AccountRecord } from '../data/accounts.ts'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AccountRecord | null
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action. */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
  onConfirm,
}: DeleteAccountDialogProps) {
  if (!account) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete account"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">{account.name}</span> (
          {account.accountId}). This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
