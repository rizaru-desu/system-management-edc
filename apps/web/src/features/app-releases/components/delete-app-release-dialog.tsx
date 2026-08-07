import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
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
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete release"
      description={
        <>
          You are about to delete release{' '}
          <span className="font-semibold text-brand-900">
            {release.versionName}
          </span>{' '}
          ({PLATFORM_LABELS[release.platform]}). This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    >
      {release.isActive ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          This is the live release currently served to devices — deleting it
          leaves the {PLATFORM_LABELS[release.platform]} update check with no
          active release until another one is published.
        </p>
      ) : undefined}
    </ConfirmModal>
  )
}
