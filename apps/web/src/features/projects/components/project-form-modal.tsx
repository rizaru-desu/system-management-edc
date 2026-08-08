import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { UnsavedChangesDialog } from '#/components/UnsavedChangesDialog.tsx'
import { useUnsavedChanges } from '#/hooks/use-unsaved-changes.ts'
import { PROJECT_STATUS_OPTIONS } from '../data/projects.ts'
import type { ProjectRecord, ProjectStatus } from '../data/projects.ts'

export interface ProjectFormValues {
  code: string
  name: string
  description: string
  status: ProjectStatus
}

interface ProjectFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  project: ProjectRecord | null
  /** Disables Save while the create/update mutation is in flight. */
  saving: boolean
  /** Bumped by the page on every duplicate-code 409 from the backend. */
  duplicateConflict: number
  onSubmit: (values: ProjectFormValues) => void
}

interface FormErrors {
  code?: string
  name?: string
}

const EMPTY: ProjectFormValues = {
  code: '',
  name: '',
  description: '',
  status: 'active',
}

/**
 * Add/Edit project modal for the Contract Management → Projects list. The
 * same controlled-field pattern as the account form modal, with a single
 * section of fields.
 */
export function ProjectFormModal({
  open,
  onOpenChange,
  project,
  saving,
  duplicateConflict,
  onSubmit,
}: ProjectFormModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] = useState<ProjectFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = project
        ? {
            code: project.code,
            name: project.name,
            description: project.description ?? '',
            status: project.status,
          }
        : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, project])

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const { guard, dialogProps } = useUnsavedChanges({ when: open && isDirty })

  // A duplicate-code 409 from the backend highlights the code field inline
  // while the toast carries the same message — the entered values survive.
  useEffect(() => {
    if (duplicateConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        code: 'Project code is already in use.',
      }))
    }
  }, [duplicateConflict])

  /** Routes dirty close attempts through the custom confirmation dialog. */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      guard(() => onOpenChange(false))
      return
    }
    onOpenChange(true)
  }

  const setField = <TField extends keyof ProjectFormValues>(
    field: TField,
    value: ProjectFormValues[TField],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field in errors) {
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return

    const nextErrors: FormErrors = {}
    const trimmedCode = values.code.trim()
    if (!trimmedCode) {
      nextErrors.code = 'Project code is required.'
    }
    if (!values.name.trim()) {
      nextErrors.name = 'Project name is required.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      code: trimmedCode,
      name: values.name.trim(),
      description: values.description.trim(),
    })
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  const requiredMark = (
    <span className="text-rose-600" aria-hidden="true">
      *
    </span>
  )

  return (
    <>
      {/* Backdrop clicks never dismiss the form — closing goes through the
        "X" button, Cancel, or a successful save (all guarded against
        unsaved changes). Header and footer stay pinned; only the field
        list scrolls. */}
      <BaseModal
        open={open}
        onOpenChange={handleOpenChange}
        size="md"
        disableOutsideClose
        loading={saving}
        title={project ? 'Edit project' : 'Add project'}
        description={
          project
            ? 'Update the project identity, description and status.'
            : 'Register a project with its description and status.'
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="project-form" disabled={saving}>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
              {project ? 'Save changes' : 'Create project'}
            </Button>
          </>
        }
      >
        <form
          id="project-form"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prj-code" className="text-[#0E2748]">
                Project code {requiredMark}
              </Label>
              <Input
                id="prj-code"
                value={values.code}
                onChange={(event) => setField('code', event.target.value)}
                placeholder="e.g. PRJ-0001"
                aria-invalid={Boolean(errors.code)}
                className={fieldClasses}
              />
              {errors.code && (
                <p className="text-xs text-rose-600">{errors.code}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prj-name" className="text-[#0E2748]">
                Project name {requiredMark}
              </Label>
              <Input
                id="prj-name"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="e.g. EDC Rollout Jabodetabek"
                aria-invalid={Boolean(errors.name)}
                className={fieldClasses}
              />
              {errors.name && (
                <p className="text-xs text-rose-600">{errors.name}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prj-description" className="text-[#0E2748]">
              Description
            </Label>
            <Textarea
              id="prj-description"
              value={values.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="What this project covers"
              className={fieldClasses}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prj-status" className="text-[#0E2748]">
              Status
            </Label>
            <Select
              value={values.status}
              onValueChange={(value) =>
                setField('status', value as ProjectStatus)
              }
            >
              <SelectTrigger
                id="prj-status"
                className={`w-full ${fieldClasses}`}
              >
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      </BaseModal>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
