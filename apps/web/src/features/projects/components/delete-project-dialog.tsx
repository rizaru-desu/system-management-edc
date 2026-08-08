import { TriangleAlert } from 'lucide-react'

import { ConfirmModal } from '#/components/ui/base-modal.tsx'
import type { ProjectRecord } from '../data/projects.ts'

interface DeleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectRecord | null
  onConfirm: () => void
}

/** Confirmation dialog for the table's Delete action. */
export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  onConfirm,
}: DeleteProjectDialogProps) {
  if (!project) return null

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      icon={TriangleAlert}
      tone="danger"
      title="Delete project"
      description={
        <>
          You are about to delete{' '}
          <span className="font-semibold text-brand-900">{project.name}</span> (
          {project.id}). This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      confirmVariant="destructive"
      onConfirm={onConfirm}
    />
  )
}
