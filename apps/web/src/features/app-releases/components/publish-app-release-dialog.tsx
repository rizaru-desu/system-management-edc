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
import { PLATFORM_LABELS } from '../data/app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

interface PublishAppReleaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  release: AppReleaseRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Publish/Unpublish action — the toggle
 * changes what every mobile device receives, so it never fires silently.
 */
export function PublishAppReleaseDialog({
  open,
  onOpenChange,
  release,
  onConfirm,
}: PublishAppReleaseDialogProps) {
  if (!release) return null

  const publishing = !release.isActive

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3F6FA8]/10 text-[#3F6FA8]">
              {publishing ? (
                <CircleArrowUp className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <CircleArrowDown className="h-5 w-5" strokeWidth={1.75} />
              )}
            </span>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              {publishing ? 'Publish release' : 'Unpublish release'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            {publishing ? (
              <>
                Publishing{' '}
                <span className="font-semibold text-[#0E2748]">
                  {release.versionName}
                </span>{' '}
                makes it the release served to every{' '}
                {PLATFORM_LABELS[release.platform]} device — the platform&apos;s
                current live release is deactivated.
              </>
            ) : (
              <>
                Unpublishing{' '}
                <span className="font-semibold text-[#0E2748]">
                  {release.versionName}
                </span>{' '}
                leaves the {PLATFORM_LABELS[release.platform]} update check
                with no active release until another one is published.
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
            {publishing ? 'Publish' : 'Unpublish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
