import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { FieldEngineerRecord } from '../data/field-engineers.ts'

interface RemoveProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engineer: FieldEngineerRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the "Remove profile" action. Only the work
 * profile goes — the underlying User account and its Field Engineer role
 * are untouched (they are managed in Users & Roles), so the user drops
 * back to "Needs Setup" in the list.
 */
export function RemoveProfileDialog({
  open,
  onOpenChange,
  engineer,
  onConfirm,
}: RemoveProfileDialogProps) {
  if (!engineer) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Remove field engineer profile"
      description={
        <>
          You are about to remove the work profile of{' '}
          <span className="font-semibold text-brand-900">{engineer.name}</span>.
          The user account and its Field Service Engineer role stay untouched —
          the engineer just goes back to “Needs Setup”.
        </>
      }
      confirmLabel="Remove profile"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
