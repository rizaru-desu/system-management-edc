import { CircleArrowDown, CircleArrowUp } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ContractLineRecord } from '../data/contract-lines.ts'

interface ToggleContractLineStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractLine: ContractLineRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Activate/Deactivate action — the
 * status drives whether the line counts toward active contract work, so it
 * never flips silently.
 */
export function ToggleContractLineStatusDialog({
  open,
  onOpenChange,
  contractLine,
  onConfirm,
}: ToggleContractLineStatusDialogProps) {
  if (!contractLine) return null

  const activating = contractLine.status !== 'active'

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={activating ? CircleArrowUp : CircleArrowDown}
      tone="info"
      title={activating ? 'Activate contract line' : 'Deactivate contract line'}
      description={
        activating ? (
          <>
            Activating{' '}
            <span className="font-semibold text-brand-900">
              {contractLine.name}
            </span>{' '}
            makes it count again toward active contract work.
          </>
        ) : (
          <>
            Deactivating{' '}
            <span className="font-semibold text-brand-900">
              {contractLine.name}
            </span>{' '}
            keeps it in the catalogue but excludes it from active contract work
            until it is reactivated.
          </>
        )
      }
      confirmLabel={activating ? 'Activate' : 'Deactivate'}
      onConfirm={onConfirm}
    />
  )
}
