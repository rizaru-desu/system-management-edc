import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { UnsavedChangesDialogProps } from '#/hooks/use-unsaved-changes.ts'

/**
 * The project-wide unsaved-changes confirmation, rendered from
 * `useUnsavedChanges().dialogProps` — the custom replacement for native
 * `window.confirm` prompts on dirty Create/Edit forms. Built on the shared
 * ConfirmModal/BaseModal architecture.
 */
export function UnsavedChangesModal({
  open,
  onStay,
  onLeave,
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmModal
      open={open}
      // `open` is fully derived from the hook's pending state — onStay and
      // onLeave (via onCancel/onConfirm below) are what actually close it.
      onOpenChange={() => {}}
      icon={TriangleAlert}
      tone="warning"
      title="Unsaved Changes"
      description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      cancelLabel="Continue Editing"
      confirmLabel="Discard Changes"
      confirmVariant="destructive"
      onConfirm={onLeave}
      onCancel={onStay}
    />
  )
}

/** Historical name; both point at the same BaseModal-backed component. */
export { UnsavedChangesModal as UnsavedChangesDialog }
