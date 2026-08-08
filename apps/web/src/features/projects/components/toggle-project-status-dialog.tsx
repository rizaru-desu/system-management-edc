import { CircleArrowDown, CircleArrowUp } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ProjectRecord } from '../data/projects.ts'

interface ToggleProjectStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectRecord | null
  onConfirm: () => void
}

/**
 * Confirmation dialog for the table's Activate/Deactivate action — the
 * status drives whether the project can receive new work, so it never
 * flips silently.
 */
export function ToggleProjectStatusDialog({
  open,
  onOpenChange,
  project,
  onConfirm,
}: ToggleProjectStatusDialogProps) {
  if (!project) return null

  const activating = project.status !== 'active'

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={activating ? CircleArrowUp : CircleArrowDown}
      tone="info"
      title={activating ? 'Activate project' : 'Deactivate project'}
      description={
        activating ? (
          <>
            Activating{' '}
            <span className="font-semibold text-brand-900">{project.name}</span>{' '}
            makes it available again for new work.
          </>
        ) : (
          <>
            Deactivating{' '}
            <span className="font-semibold text-brand-900">{project.name}</span>{' '}
            keeps it in the catalogue but excludes it from new work until it is
            reactivated.
          </>
        )
      }
      confirmLabel={activating ? 'Activate' : 'Deactivate'}
      onConfirm={onConfirm}
    />
  )
}
