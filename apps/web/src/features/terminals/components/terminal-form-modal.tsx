import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  terminalMerchantOptionsQueryOptions,
  terminalProductOptionsQueryOptions,
  terminalWarehouseOptionsQueryOptions,
} from '../api/form-options.ts'
import {
  TERMINAL_CONDITIONS,
  TERMINAL_CONDITION_LABELS,
  TERMINAL_STATUSES,
  TERMINAL_STATUS_LABELS,
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
  merchantId: string
  /** yyyy-mm-dd; defaults to today on create. */
  entryDate: string
  notes: string
}

interface TerminalFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  terminal: TerminalRecord | null
  /** True while the create/update mutation is in flight. */
  saving: boolean
  /**
   * Bumped by the page on every duplicate-serial 409 from the backend, so
   * the serial field highlights inline without losing the entered values.
   */
  duplicateSerialConflict: number
  onSubmit: (values: TerminalFormValues) => void
}

interface FormErrors {
  serialNumber?: string
  productId?: string
  warehouseId?: string
  status?: string
  condition?: string
  merchantId?: string
  entryDate?: string
}

const EMPTY: TerminalFormValues = {
  serialNumber: '',
  productId: '',
  warehouseId: '',
  status: '',
  condition: '',
  merchantId: '',
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
  saving,
  duplicateSerialConflict,
  onSubmit,
}: TerminalFormModalProps) {
  const [values, setValues] = useState<TerminalFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] = useState<TerminalFormValues>(EMPTY)

  // Dropdown sources come from the terminals module's own options
  // endpoints (products active-only, warehouses in tree order with depth,
  // merchants active-only) — fetched only while the modal is open.
  const productsQuery = useQuery({
    ...terminalProductOptionsQueryOptions(),
    enabled: open,
  })
  const warehousesQuery = useQuery({
    ...terminalWarehouseOptionsQueryOptions(),
    enabled: open,
  })
  const merchantsQuery = useQuery({
    ...terminalMerchantOptionsQueryOptions(),
    enabled: open,
  })
  const productOptions = productsQuery.data ?? []
  const warehouseOptions = warehousesQuery.data ?? []
  const merchantOptions = merchantsQuery.data ?? []
  const optionsPending =
    productsQuery.isPending ||
    warehousesQuery.isPending ||
    merchantsQuery.isPending
  const optionsError =
    productsQuery.isError || warehousesQuery.isError || merchantsQuery.isError

  // Re-seed the form whenever the modal opens for a different target; a
  // fresh create defaults the entry date to today (client-side, on open).
  useEffect(() => {
    if (open) {
      const seeded = terminal
        ? {
            serialNumber: terminal.serialNumber,
            productId: terminal.productId,
            warehouseId: terminal.warehouseId ?? '',
            status: terminal.status,
            condition: terminal.condition,
            merchantId: terminal.merchantId ?? '',
            entryDate: terminal.entryDate,
            notes: terminal.notes,
          }
        : { ...EMPTY, entryDate: new Date().toISOString().slice(0, 10) }
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, terminal])

  // A duplicate-serial 409 from the backend highlights the field inline
  // while the toast carries the same message — the entered values survive.
  useEffect(() => {
    if (duplicateSerialConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        serialNumber: 'A terminal with this serial number already exists.',
      }))
    }
  }, [duplicateSerialConflict])

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const { guard, dialogProps } = useUnsavedChanges({ when: open && isDirty })

  /** Routes dirty close attempts through the custom confirmation dialog. */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (saving) return
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
      merchantId: status === 'installed' ? previous.merchantId : '',
    }))
    setErrors((previous) => ({
      ...previous,
      status: undefined,
      merchantId: undefined,
    }))
  }

  const isInstalled = values.status === 'installed'

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    const nextErrors: FormErrors = {}
    const serialNumber = values.serialNumber.trim()
    if (!serialNumber) nextErrors.serialNumber = 'Serial number is required.'
    if (!values.productId) nextErrors.productId = 'Product is required.'
    if (!values.warehouseId) {
      nextErrors.warehouseId = 'Current warehouse is required.'
    }
    if (!values.status) nextErrors.status = 'Status is required.'
    if (!values.condition) nextErrors.condition = 'Condition is required.'
    if (isInstalled && !values.merchantId) {
      nextErrors.merchantId =
        'Select the merchant this terminal is installed at.'
    }
    if (!values.entryDate) nextErrors.entryDate = 'Entry date is required.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // Serial uniqueness and the reference rules stay the backend's call
    // (409/400) — the page keeps the modal open and surfaces the message.
    onSubmit({
      ...values,
      serialNumber,
      merchantId: isInstalled ? values.merchantId : '',
      notes: values.notes.trim(),
    })
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
        loading={saving}
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
            <Button type="submit" form="terminal-form" disabled={saving}>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
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
          {optionsError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              Failed to load some dropdown options — close the dialog and try
              again.
            </p>
          )}
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
                disabled={productsQuery.isPending}
              >
                <SelectTrigger
                  id="trm-product"
                  aria-invalid={Boolean(errors.productId)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue
                    placeholder={
                      productsQuery.isPending
                        ? 'Loading products…'
                        : 'Select a product model'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((option) => (
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
              disabled={warehousesQuery.isPending}
            >
              <SelectTrigger
                id="trm-warehouse"
                aria-invalid={Boolean(errors.warehouseId)}
                className={`w-full ${fieldClasses}`}
              >
                <SelectValue
                  placeholder={
                    warehousesQuery.isPending
                      ? 'Loading warehouses…'
                      : 'Select a warehouse'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.map((option) => (
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
              {errors.status ? (
                <p className="text-xs text-rose-600">{errors.status}</p>
              ) : (
                <p className="text-xs text-[#0E2748]/50">
                  Status and warehouse changes are logged into the movement
                  history automatically.
                </p>
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
                value={values.merchantId}
                onValueChange={(value) => setField('merchantId', value)}
                disabled={!isInstalled || merchantsQuery.isPending}
              >
                <SelectTrigger
                  id="trm-merchant"
                  aria-invalid={Boolean(errors.merchantId)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue
                    placeholder={
                      !isInstalled
                        ? 'Set status to Installed first'
                        : merchantsQuery.isPending
                          ? 'Loading merchants…'
                          : 'Select a merchant'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {merchantOptions.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.merchantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.merchantId && (
                <p className="text-xs text-rose-600">{errors.merchantId}</p>
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
          {optionsPending && (
            <p className="flex items-center gap-2 text-xs text-[#0E2748]/50">
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                strokeWidth={1.75}
              />
              Loading dropdown options…
            </p>
          )}
        </form>
      </BaseModal>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
