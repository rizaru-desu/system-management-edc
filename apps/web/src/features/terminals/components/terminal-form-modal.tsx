import { useEffect, useMemo, useState } from 'react'

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
  MERCHANT_OPTIONS,
  PRODUCT_OPTIONS,
  TERMINAL_CONDITIONS,
  TERMINAL_CONDITION_LABELS,
  TERMINAL_STATUSES,
  TERMINAL_STATUS_LABELS,
  WAREHOUSE_OPTIONS,
} from '../data/terminals.ts'
import type {
  TerminalCondition,
  TerminalRecord,
  TerminalStatus,
} from '../data/terminals.ts'

export interface TerminalFormValues {
  serialNumber: string
  /** '' until the user picks one — required, validated on submit. */
  productId: string
  warehouseId: string
  status: TerminalStatus | ''
  condition: TerminalCondition | ''
  /** Only meaningful (and required) while status = installed. */
  merchantName: string
  /** yyyy-mm-dd; defaults to today on create. */
  entryDate: string
  notes: string
}

interface TerminalFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  terminal: TerminalRecord | null
  /** True when another terminal already uses `serial` (mock uniqueness). */
  isSerialTaken: (serial: string) => boolean
  onSubmit: (values: TerminalFormValues) => void
}

interface FormErrors {
  serialNumber?: string
  productId?: string
  warehouseId?: string
  status?: string
  condition?: string
  merchantName?: string
  entryDate?: string
}

const EMPTY: TerminalFormValues = {
  serialNumber: '',
  productId: '',
  warehouseId: '',
  status: '',
  condition: '',
  merchantName: '',
  entryDate: '',
  notes: '',
}

/** Short type tag shown behind each warehouse option. */
const WAREHOUSE_TYPE_TAGS: Record<string, string> = {
  central: 'Central',
  regional: 'Regional',
  'service-point': 'Service Point',
}

export function TerminalFormModal({
  open,
  onOpenChange,
  terminal,
  isSerialTaken,
  onSubmit,
}: TerminalFormModalProps) {
  const [values, setValues] = useState<TerminalFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] = useState<TerminalFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target; a
  // fresh create defaults the entry date to today (client-side, on open).
  useEffect(() => {
    if (open) {
      const seeded = terminal
        ? {
            serialNumber: terminal.serialNumber,
            productId: terminal.productId,
            warehouseId: terminal.warehouseId,
            status: terminal.status,
            condition: terminal.condition,
            merchantName: terminal.merchantName,
            entryDate: terminal.entryDate,
            notes: terminal.notes,
          }
        : { ...EMPTY, entryDate: new Date().toISOString().slice(0, 10) }
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, terminal])

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const { guard, dialogProps } = useUnsavedChanges({ when: open && isDirty })

  /** Routes dirty close attempts through the custom confirmation dialog. */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      guard(() => onOpenChange(false))
      return
    }
    onOpenChange(true)
  }

  const setField = <TField extends keyof TerminalFormValues>(
    field: TField,
    value: TerminalFormValues[TField],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field in errors) {
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  /** Leaving Installed clears the merchant — it only applies while installed. */
  const handleStatusChange = (status: TerminalStatus) => {
    setValues((previous) => ({
      ...previous,
      status,
      merchantName: status === 'installed' ? previous.merchantName : '',
    }))
    setErrors((previous) => ({
      ...previous,
      status: undefined,
      merchantName: undefined,
    }))
  }

  const isInstalled = values.status === 'installed'

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const serialNumber = values.serialNumber.trim()
    if (!serialNumber) {
      nextErrors.serialNumber = 'Serial number is required.'
    } else if (isSerialTaken(serialNumber)) {
      nextErrors.serialNumber =
        'A terminal with this serial number already exists.'
    }
    if (!values.productId) nextErrors.productId = 'Product is required.'
    if (!values.warehouseId) {
      nextErrors.warehouseId = 'Current warehouse is required.'
    }
    if (!values.status) nextErrors.status = 'Status is required.'
    if (!values.condition) nextErrors.condition = 'Condition is required.'
    if (isInstalled && !values.merchantName) {
      nextErrors.merchantName =
        'Select the merchant this terminal is installed at.'
    }
    if (!values.entryDate) nextErrors.entryDate = 'Entry date is required.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      serialNumber,
      merchantName: isInstalled ? values.merchantName : '',
      notes: values.notes.trim(),
    })
    onOpenChange(false)
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={handleOpenChange}
        size="lg"
        disableOutsideClose
        title={terminal ? 'Edit terminal' : 'Add terminal'}
        description={
          terminal
            ? 'Update the unit details, its location and lifecycle status.'
            : 'Register a unit manually — in the production flow units are created by Inbound Shipment inspections; use this for legacy data and corrections.'
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
            <Button type="submit" form="terminal-form">
              {terminal ? 'Save changes' : 'Create terminal'}
            </Button>
          </>
        }
      >
        <form
          id="terminal-form"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trm-serial" className="text-[#0E2748]">
                Serial number{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="trm-serial"
                value={values.serialNumber}
                onChange={(event) =>
                  setField('serialNumber', event.target.value)
                }
                placeholder="e.g. PAX-2401-00021"
                aria-invalid={Boolean(errors.serialNumber)}
                className={fieldClasses}
              />
              {errors.serialNumber && (
                <p className="text-xs text-rose-600">{errors.serialNumber}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trm-product" className="text-[#0E2748]">
                Product{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={values.productId}
                onValueChange={(value) => setField('productId', value)}
              >
                <SelectTrigger
                  id="trm-product"
                  aria-invalid={Boolean(errors.productId)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a product model" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.modelName} — {option.brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-xs text-rose-600">{errors.productId}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trm-warehouse" className="text-[#0E2748]">
              Current warehouse{' '}
              <span className="text-rose-600" aria-hidden="true">
                *
              </span>
            </Label>
            <Select
              value={values.warehouseId}
              onValueChange={(value) => setField('warehouseId', value)}
            >
              <SelectTrigger
                id="trm-warehouse"
                aria-invalid={Boolean(errors.warehouseId)}
                className={`w-full ${fieldClasses}`}
              >
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {/* Figure-space indent mirrors the tree depth. */}
                    {'  '.repeat(option.depth)}
                    {option.name} ({WAREHOUSE_TYPE_TAGS[option.type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouseId && (
              <p className="text-xs text-rose-600">{errors.warehouseId}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trm-status" className="text-[#0E2748]">
                Status{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  handleStatusChange(value as TerminalStatus)
                }
              >
                <SelectTrigger
                  id="trm-status"
                  aria-invalid={Boolean(errors.status)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {TERMINAL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {TERMINAL_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-xs text-rose-600">{errors.status}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trm-condition" className="text-[#0E2748]">
                Condition{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={values.condition}
                onValueChange={(value) =>
                  setField('condition', value as TerminalCondition)
                }
              >
                <SelectTrigger
                  id="trm-condition"
                  aria-invalid={Boolean(errors.condition)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a condition" />
                </SelectTrigger>
                <SelectContent>
                  {TERMINAL_CONDITIONS.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {TERMINAL_CONDITION_LABELS[condition]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-xs text-rose-600">{errors.condition}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trm-merchant" className="text-[#0E2748]">
                Installed merchant{' '}
                {isInstalled ? (
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                ) : (
                  <span className="font-normal text-[#0E2748]/40">
                    (Installed only)
                  </span>
                )}
              </Label>
              <Select
                value={values.merchantName}
                onValueChange={(value) => setField('merchantName', value)}
                disabled={!isInstalled}
              >
                <SelectTrigger
                  id="trm-merchant"
                  aria-invalid={Boolean(errors.merchantName)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue
                    placeholder={
                      isInstalled
                        ? 'Select a merchant'
                        : 'Set status to Installed first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {MERCHANT_OPTIONS.map((merchant) => (
                    <SelectItem key={merchant} value={merchant}>
                      {merchant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.merchantName ? (
                <p className="text-xs text-rose-600">{errors.merchantName}</p>
              ) : (
                <p className="text-xs text-[#0E2748]/50">
                  Dummy list until the Merchant module serves real options.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trm-entry-date" className="text-[#0E2748]">
                Entry date{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="trm-entry-date"
                type="date"
                value={values.entryDate}
                onChange={(event) => setField('entryDate', event.target.value)}
                aria-invalid={Boolean(errors.entryDate)}
                className={fieldClasses}
              />
              {errors.entryDate && (
                <p className="text-xs text-rose-600">{errors.entryDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trm-notes" className="text-[#0E2748]">
              Notes{' '}
              <span className="font-normal text-[#0E2748]/40">(optional)</span>
            </Label>
            <Textarea
              id="trm-notes"
              value={values.notes}
              maxLength={500}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="e.g. Unit hasil migrasi data lama"
              className={fieldClasses}
            />
          </div>
        </form>
      </BaseModal>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
