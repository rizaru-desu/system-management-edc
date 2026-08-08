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
import {
  CONTRACT_LINE_STATUS_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
} from '../data/contract-lines.ts'
import type {
  ContractLineRecord,
  ContractLineStatus,
  DocumentStatus,
} from '../data/contract-lines.ts'

/** Relational choice for the account/project selects ("[CODE] Name"). */
export interface RelationOption {
  value: string
  label: string
}

export interface ContractLineFormValues {
  lineNumber: string
  lineName: string
  status: ContractLineStatus
  documentStatus: DocumentStatus
  vendorEdc: string
  accountId: string
  projectId: string
  serviceItem: string
  startDate: string
  endDate: string
  notes: string
}

interface ContractLineFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  contractLine: ContractLineRecord | null
  /** Live account choices from the backend catalogue (never hardcoded). */
  accountOptions: Array<RelationOption>
  /** Live project choices from the backend catalogue (never hardcoded). */
  projectOptions: Array<RelationOption>
  /** Disables Save while the create/update mutation is in flight. */
  saving: boolean
  /** Bumped by the page on every duplicate-number 409 from the backend. */
  duplicateConflict: number
  onSubmit: (values: ContractLineFormValues) => void
}

interface FormErrors {
  lineNumber?: string
  lineName?: string
  accountId?: string
  projectId?: string
  endDate?: string
}

const EMPTY: ContractLineFormValues = {
  lineNumber: '',
  lineName: '',
  status: 'active',
  documentStatus: 'draft',
  vendorEdc: '',
  accountId: '',
  projectId: '',
  serviceItem: '',
  startDate: '',
  endDate: '',
  notes: '',
}

/** Section heading separating the identity/assignment/timeline blocks. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-brand-100 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-900/45">
      {children}
    </p>
  )
}

/**
 * Add/Edit contract line modal for the Contract Management → Contract Lines
 * list. The same controlled-field pattern as the account form modal, with
 * the form grouped into Identity / Assignment / Timeline & Notes sections
 * and searchable relational selects for the owning account and project.
 */
export function ContractLineFormModal({
  open,
  onOpenChange,
  contractLine,
  accountOptions,
  projectOptions,
  saving,
  duplicateConflict,
  onSubmit,
}: ContractLineFormModalProps) {
  const [values, setValues] = useState<ContractLineFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] =
    useState<ContractLineFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = contractLine
        ? {
            lineNumber: contractLine.lineNumber,
            lineName: contractLine.name,
            status: contractLine.status,
            documentStatus: contractLine.documentStatus,
            vendorEdc: contractLine.vendorEdc ?? '',
            accountId: contractLine.accountId,
            projectId: contractLine.projectId,
            serviceItem: contractLine.serviceItem ?? '',
            startDate: contractLine.startDate,
            endDate: contractLine.endDate,
            notes: contractLine.notes ?? '',
          }
        : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, contractLine])

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const { guard, dialogProps } = useUnsavedChanges({ when: open && isDirty })

  // A duplicate-number 409 from the backend highlights the line number
  // field inline while the toast carries the same message — the entered
  // values survive.
  useEffect(() => {
    if (duplicateConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        lineNumber: 'Line number is already in use.',
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

  // An edited record may reference an account/project missing from the live
  // catalogue page (or placeholder data) — keep it selectable so editing
  // never silently drops the reference.
  const accountSelectOptions = useMemo(() => {
    if (
      contractLine &&
      !accountOptions.some((option) => option.value === contractLine.accountId)
    ) {
      return [
        { value: contractLine.accountId, label: contractLine.accountLabel },
        ...accountOptions,
      ]
    }
    return accountOptions
  }, [accountOptions, contractLine])

  const projectSelectOptions = useMemo(() => {
    if (
      contractLine &&
      !projectOptions.some((option) => option.value === contractLine.projectId)
    ) {
      return [
        { value: contractLine.projectId, label: contractLine.projectLabel },
        ...projectOptions,
      ]
    }
    return projectOptions
  }, [projectOptions, contractLine])

  const setField = <TField extends keyof ContractLineFormValues>(
    field: TField,
    value: ContractLineFormValues[TField],
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
    const trimmedNumber = values.lineNumber.trim()
    if (!trimmedNumber) {
      nextErrors.lineNumber = 'Line number is required.'
    }
    if (!values.lineName.trim()) {
      nextErrors.lineName = 'Line name is required.'
    }
    if (!values.accountId) {
      nextErrors.accountId = 'Account is required.'
    }
    if (!values.projectId) {
      nextErrors.projectId = 'Project is required.'
    }
    if (
      values.startDate &&
      values.endDate &&
      values.endDate < values.startDate
    ) {
      nextErrors.endDate = 'End date must be on or after the start date.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      lineNumber: trimmedNumber,
      lineName: values.lineName.trim(),
      vendorEdc: values.vendorEdc.trim(),
      serviceItem: values.serviceItem.trim(),
      notes: values.notes.trim(),
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
        size="lg"
        disableOutsideClose
        loading={saving}
        title={contractLine ? 'Edit contract line' : 'Add contract line'}
        description={
          contractLine
            ? 'Update the contract line identity, assignment and timeline.'
            : 'Register a contract line and assign it to an account and project.'
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
            <Button type="submit" form="contract-line-form" disabled={saving}>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
              {contractLine ? 'Save changes' : 'Create contract line'}
            </Button>
          </>
        }
      >
        <form
          id="contract-line-form"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          {/* Section 1 — Identity */}
          <SectionTitle>Identity</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cl-number" className="text-[#0E2748]">
                Line number {requiredMark}
              </Label>
              <Input
                id="cl-number"
                value={values.lineNumber}
                onChange={(event) => setField('lineNumber', event.target.value)}
                placeholder="e.g. CL-2026-0001"
                aria-invalid={Boolean(errors.lineNumber)}
                className={fieldClasses}
              />
              {errors.lineNumber && (
                <p className="text-xs text-rose-600">{errors.lineNumber}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-name" className="text-[#0E2748]">
                Line name {requiredMark}
              </Label>
              <Input
                id="cl-name"
                value={values.lineName}
                onChange={(event) => setField('lineName', event.target.value)}
                placeholder="e.g. Jabodetabek Master Terminal Lease"
                aria-invalid={Boolean(errors.lineName)}
                className={fieldClasses}
              />
              {errors.lineName && (
                <p className="text-xs text-rose-600">{errors.lineName}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cl-status" className="text-[#0E2748]">
                Status
              </Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  setField('status', value as ContractLineStatus)
                }
              >
                <SelectTrigger
                  id="cl-status"
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_LINE_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-document-status" className="text-[#0E2748]">
                Document status
              </Label>
              <Select
                value={values.documentStatus}
                onValueChange={(value) =>
                  setField('documentStatus', value as DocumentStatus)
                }
              >
                <SelectTrigger
                  id="cl-document-status"
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a document status" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2 — Assignment */}
          <SectionTitle>Assignment</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cl-account" className="text-[#0E2748]">
                Account {requiredMark}
              </Label>
              <Select
                searchable
                value={values.accountId || undefined}
                onValueChange={(value) => setField('accountId', value)}
                options={accountSelectOptions}
                placeholder="Select the owning account"
                searchPlaceholder="Search ID or name…"
                id="cl-account"
                aria-invalid={Boolean(errors.accountId)}
                triggerClassName={`w-full ${fieldClasses}`}
              />
              {errors.accountId && (
                <p className="text-xs text-rose-600">{errors.accountId}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-project" className="text-[#0E2748]">
                Project {requiredMark}
              </Label>
              <Select
                searchable
                value={values.projectId || undefined}
                onValueChange={(value) => setField('projectId', value)}
                options={projectSelectOptions}
                placeholder="Select the owning project"
                searchPlaceholder="Search code or name…"
                id="cl-project"
                aria-invalid={Boolean(errors.projectId)}
                triggerClassName={`w-full ${fieldClasses}`}
              />
              {errors.projectId && (
                <p className="text-xs text-rose-600">{errors.projectId}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cl-vendor" className="text-[#0E2748]">
                Vendor EDC
              </Label>
              <Input
                id="cl-vendor"
                value={values.vendorEdc}
                onChange={(event) => setField('vendorEdc', event.target.value)}
                placeholder="e.g. Ingenico"
                className={fieldClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-service-item" className="text-[#0E2748]">
                Service item
              </Label>
              <Input
                id="cl-service-item"
                value={values.serviceItem}
                onChange={(event) =>
                  setField('serviceItem', event.target.value)
                }
                placeholder="e.g. Terminal lease — Move/2500"
                className={fieldClasses}
              />
            </div>
          </div>

          {/* Section 3 — Timeline & Notes */}
          <SectionTitle>Timeline &amp; Notes</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cl-start-date" className="text-[#0E2748]">
                Start date
              </Label>
              <Input
                id="cl-start-date"
                type="date"
                value={values.startDate}
                max={values.endDate || undefined}
                onChange={(event) => setField('startDate', event.target.value)}
                className={fieldClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-end-date" className="text-[#0E2748]">
                End date
              </Label>
              <Input
                id="cl-end-date"
                type="date"
                value={values.endDate}
                min={values.startDate || undefined}
                onChange={(event) => setField('endDate', event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                className={fieldClasses}
              />
              {errors.endDate && (
                <p className="text-xs text-rose-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cl-notes" className="text-[#0E2748]">
              Notes
            </Label>
            <Textarea
              id="cl-notes"
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="Anything worth remembering about this line"
              className={fieldClasses}
            />
          </div>
        </form>
      </BaseModal>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
