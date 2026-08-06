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
import { PLATFORM_LABELS } from '../data/app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

interface DeleteAppReleaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  release: AppReleaseRecord | null
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action (hard delete). */
export function DeleteAppReleaseDialog({
  open,
  onOpenChange,
  release,
  onConfirm,
}: DeleteAppReleaseDialogProps) {
  if (!release) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <TriangleAlert className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              Delete release
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            You are about to delete release{' '}
            <span className="font-semibold text-[#0E2748]">
              {release.versionName}
            </span>{' '}
            ({PLATFORM_LABELS[release.platform]}). This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {release.isActive && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            This is the live release currently served to devices — deleting it
            leaves the {PLATFORM_LABELS[release.platform]} update check with no
            active release until another one is published.
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
