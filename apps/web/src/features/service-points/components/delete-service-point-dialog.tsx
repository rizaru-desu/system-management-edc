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
import type { ServicePointRecord } from '../data/service-points.ts'

interface DeleteServicePointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servicePoint: ServicePointRecord | null
  /** Everything below the record — removed together to keep the tree intact. */
  descendantCount: number
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action (UI only — mock data). */
export function DeleteServicePointDialog({
  open,
  onOpenChange,
  servicePoint,
  descendantCount,
  onConfirm,
}: DeleteServicePointDialogProps) {
  if (!servicePoint) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <TriangleAlert className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              Delete service point
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            You are about to delete{' '}
            <span className="font-semibold text-[#0E2748]">
              {servicePoint.name}
            </span>{' '}
            ({servicePoint.code}). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {descendantCount > 0 && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            This service point has {descendantCount}{' '}
            {descendantCount === 1
              ? 'service point'
              : 'service points'}{' '}
            nested under it — they will be deleted as well.
          </p>
        )}

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
