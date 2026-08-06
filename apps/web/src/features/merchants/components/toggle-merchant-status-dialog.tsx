import { CircleArrowDown, CircleArrowUp } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import type { MerchantRecord } from '../data/merchants.ts'

interface ToggleMerchantStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchant: MerchantRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Activate/Deactivate action — the
 * status drives whether terminals can be deployed to the merchant, so it
 * never flips silently.
 */
export function ToggleMerchantStatusDialog({
  open,
  onOpenChange,
  merchant,
  onConfirm,
}: ToggleMerchantStatusDialogProps) {
  if (!merchant) return null

  const activating = merchant.status !== 'active'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3F6FA8]/10 text-[#3F6FA8]">
              {activating ? (
                <CircleArrowUp className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <CircleArrowDown className="h-5 w-5" strokeWidth={1.75} />
              )}
            </span>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              {activating ? 'Activate merchant' : 'Deactivate merchant'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            {activating ? (
              <>
                Activating{' '}
                <span className="font-semibold text-[#0E2748]">
                  {merchant.name}
                </span>{' '}
                makes it available again for terminal deployments and service
                operations.
              </>
            ) : (
              <>
                Deactivating{' '}
                <span className="font-semibold text-[#0E2748]">
                  {merchant.name}
                </span>{' '}
                keeps it in the catalogue but excludes it from terminal
                deployments until it is reactivated.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {activating ? 'Activate' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
