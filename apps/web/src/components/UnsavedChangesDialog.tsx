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
import type { UnsavedChangesDialogProps } from '#/hooks/use-unsaved-changes.ts'

/**
 * The project-wide unsaved-changes confirmation, rendered from
 * `useUnsavedChanges().dialogProps` — the custom replacement for native
 * `window.confirm` prompts on dirty Create/Edit forms.
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Dismissing (Esc / overlay / X) means staying on the form.
        if (!nextOpen) onStay()
      }}
    >
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <TriangleAlert className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              Unsaved Changes
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            You have unsaved changes. Are you sure you want to leave this page?
            Your changes will be lost.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={onStay}>Stay</Button>
          <Button variant="destructive" onClick={onLeave}>
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
