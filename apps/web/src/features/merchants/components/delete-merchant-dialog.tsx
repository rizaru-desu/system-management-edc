import { TriangleAlert } from 'lucide-react'

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <TriangleAlert className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              Delete merchant
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            You are about to delete{' '}
            <span className="font-semibold text-[#0E2748]">
              {merchant.name}
            </span>{' '}
            ({merchant.code}). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
