import { CircleArrowDown, CircleArrowUp } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
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
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={publishing ? CircleArrowUp : CircleArrowDown}
      tone="info"
      title={publishing ? 'Publish release' : 'Unpublish release'}
      description={
        publishing ? (
          <>
            Publishing{' '}
            <span className="font-semibold text-brand-900">
              {release.versionName}
            </span>{' '}
            makes it the release served to every{' '}
            {PLATFORM_LABELS[release.platform]} device — the platform&apos;s
            current live release is deactivated.
          </>
        ) : (
          <>
            Unpublishing{' '}
            <span className="font-semibold text-brand-900">
              {release.versionName}
            </span>{' '}
            leaves the {PLATFORM_LABELS[release.platform]} update check with no
            active release until another one is published.
          </>
        )
      }
      confirmLabel={publishing ? 'Publish' : 'Unpublish'}
      onConfirm={onConfirm}
    />
  )
}
