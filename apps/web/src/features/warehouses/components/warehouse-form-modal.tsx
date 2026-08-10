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
import { Switch } from '#/components/ui/switch.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { UnsavedChangesDialog } from '#/components/UnsavedChangesDialog.tsx'
import { useUnsavedChanges } from '#/hooks/use-unsaved-changes.ts'
import {
  WAREHOUSE_PARENT_TYPE,
  WAREHOUSE_TYPES,
  WAREHOUSE_TYPE_LABELS,
} from '../data/warehouses.ts'
import type { WarehouseRecord, WarehouseType } from '../data/warehouses.ts'
import type { ParentOption } from '../lib/tree.ts'

export interface WarehouseFormValues {
  name: string
  code: string
  /** '' until the user picks one — required, validated on submit. */
  type: WarehouseType | ''
  /** null while the selected type is Central (or nothing picked yet). */
  parentId: string | null
  region: string
  address: string
  picName: string
  picContact: string
  /** Capacity in units as entered; '' = not set. */
  capacity: string
  status: WarehouseRecord['status']
}

interface WarehouseFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  warehouse: WarehouseRecord | null
  /**
   * True when the edited record has children — its type is locked, since
   * changing the level would orphan the subtree's parent rules.
   */
  hasChildren: boolean
  /**
   * Valid parent choices for a given type (only the one level above it;
   * the page pre-excludes the edited record and its descendants).
   */
  getParentOptions: (type: WarehouseType) => Array<ParentOption>
  /** True when another warehouse already uses `code` (mock uniqueness). */
  isCodeTaken: (code: string) => boolean
  onSubmit: (values: WarehouseFormValues) => void
}

interface FormErrors {
  name?: string
  code?: string
  type?: string
  parentId?: string
  region?: string
  address?: string
  picName?: string
  capacity?: string
}

const EMPTY: WarehouseFormValues = {
  name: '',
  code: '',
  type: '',
  parentId: null,
  region: '',
  address: '',
  picName: '',
  picContact: '',
  capacity: '',
  status: 'active',
}

/** Human wording of the parent rule per type, for hints and errors. */
function parentRuleHint(type: WarehouseType): string {
  const parentType = WAREHOUSE_PARENT_TYPE[type]
  if (parentType === null) {
    return 'Central warehouses sit at the top level and have no parent.'
  }
  return `A ${WAREHOUSE_TYPE_LABELS[type]} warehouse must sit under a ${WAREHOUSE_TYPE_LABELS[parentType]} warehouse.`
}

export function WarehouseFormModal({
  open,
  onOpenChange,
  warehouse,
  hasChildren,
  getParentOptions,
  isCodeTaken,
  onSubmit,
}: WarehouseFormModalProps) {
  const [values, setValues] = useState<WarehouseFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] = useState<WarehouseFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = warehouse
        ? {
            name: warehouse.name,
            code: warehouse.code,
            type: warehouse.type,
            parentId: warehouse.parentId,
            region: warehouse.region,
            address: warehouse.address,
            picName: warehouse.picName,
            picContact: warehouse.picContact,
            capacity:
              warehouse.capacity === null ? '' : String(warehouse.capacity),
            status: warehouse.status,
          }
        : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, warehouse])

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

  const setField = <TField extends keyof WarehouseFormValues>(
    field: TField,
    value: WarehouseFormValues[TField],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field in errors) {
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  /** Changing the level invalidates the parent pick — reset it with it. */
  const handleTypeChange = (type: WarehouseType) => {
    setValues((previous) => ({ ...previous, type, parentId: null }))
    setErrors((previous) => ({
      ...previous,
      type: undefined,
      parentId: undefined,
    }))
  }

  const parentType = values.type ? WAREHOUSE_PARENT_TYPE[values.type] : null
  const parentOptions = useMemo(
    () => (values.type ? getParentOptions(values.type) : []),
    [values.type, getParentOptions],
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const name = values.name.trim()
    const code = values.code.trim()
    if (!name) nextErrors.name = 'Warehouse name is required.'
    if (!code) {
      nextErrors.code = 'Warehouse code is required.'
    } else if (isCodeTaken(code)) {
      nextErrors.code = 'A warehouse with this code already exists.'
    }
    if (!values.type) {
      nextErrors.type = 'Warehouse type is required.'
    } else if (parentType === null) {
      // Central never carries a parent; the field is hidden, but guard the
      // invariant anyway in case a stale selection survived a type change.
      if (values.parentId !== null) {
        nextErrors.parentId = 'A Central warehouse cannot have a parent.'
      }
    } else if (!values.parentId) {
      nextErrors.parentId = `Select the ${WAREHOUSE_TYPE_LABELS[parentType]} warehouse this one belongs to.`
    }
    if (!values.region.trim()) nextErrors.region = 'Region is required.'
    if (!values.address.trim()) nextErrors.address = 'Address is required.'
    if (!values.picName.trim()) nextErrors.picName = 'PIC name is required.'
    if (values.capacity.trim()) {
      const capacity = Number(values.capacity)
      if (Number.isNaN(capacity) || !Number.isInteger(capacity)) {
        nextErrors.capacity = 'Capacity must be a whole number.'
      } else if (capacity <= 0) {
        nextErrors.capacity = 'Capacity must be greater than 0.'
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      name,
      code,
      region: values.region.trim(),
      address: values.address.trim(),
      picName: values.picName.trim(),
      picContact: values.picContact.trim(),
      capacity: values.capacity.trim(),
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
        title={warehouse ? 'Edit warehouse' : 'Add warehouse'}
        description={
          warehouse
            ? 'Update the warehouse details and its place in the hierarchy.'
            : 'Create a warehouse and choose where it sits in the Central → Regional → Service Point hierarchy.'
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
            <Button type="submit" form="warehouse-form">
              {warehouse ? 'Save changes' : 'Create warehouse'}
            </Button>
          </>
        }
      >
        <form
          id="warehouse-form"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wh-name" className="text-[#0E2748]">
                Warehouse name{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="wh-name"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="e.g. Gudang Pusat Jakarta"
                aria-invalid={Boolean(errors.name)}
                className={fieldClasses}
              />
              {errors.name && (
                <p className="text-xs text-rose-600">{errors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-code" className="text-[#0E2748]">
                Warehouse code{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="wh-code"
                value={values.code}
                onChange={(event) => setField('code', event.target.value)}
                placeholder="e.g. WH-CTR-JKT"
                aria-invalid={Boolean(errors.code)}
                className={fieldClasses}
              />
              {errors.code && (
                <p className="text-xs text-rose-600">{errors.code}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wh-type" className="text-[#0E2748]">
                Type{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={values.type}
                onValueChange={(value) =>
                  handleTypeChange(value as WarehouseType)
                }
                disabled={hasChildren}
              >
                <SelectTrigger
                  id="wh-type"
                  aria-invalid={Boolean(errors.type)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {WAREHOUSE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type ? (
                <p className="text-xs text-rose-600">{errors.type}</p>
              ) : hasChildren ? (
                <p className="text-xs text-[#0E2748]/50">
                  The type is locked while warehouses still sit under this one.
                </p>
              ) : (
                values.type && (
                  <p className="text-xs text-[#0E2748]/50">
                    {parentRuleHint(values.type)}
                  </p>
                )
              )}
            </div>
            {/* Central has no parent, so the field only renders for the
              nested levels — with options limited to the one valid type. */}
            {values.type !== '' && parentType !== null && (
              <div className="space-y-1.5">
                <Label htmlFor="wh-parent" className="text-[#0E2748]">
                  Parent warehouse ({WAREHOUSE_TYPE_LABELS[parentType]}){' '}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Select
                  value={values.parentId ?? ''}
                  onValueChange={(value) => setField('parentId', value)}
                  disabled={parentOptions.length === 0}
                >
                  <SelectTrigger
                    id="wh-parent"
                    aria-invalid={Boolean(errors.parentId)}
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue
                      placeholder={`Select a ${WAREHOUSE_TYPE_LABELS[parentType]} warehouse`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parentId ? (
                  <p className="text-xs text-rose-600">{errors.parentId}</p>
                ) : (
                  parentOptions.length === 0 && (
                    <p className="text-xs text-rose-600">
                      No {WAREHOUSE_TYPE_LABELS[parentType]} warehouse exists
                      yet — create one first.
                    </p>
                  )
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wh-region" className="text-[#0E2748]">
              Region{' '}
              <span className="text-rose-600" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="wh-region"
              value={values.region}
              onChange={(event) => setField('region', event.target.value)}
              placeholder="e.g. Jawa Barat"
              aria-invalid={Boolean(errors.region)}
              className={fieldClasses}
            />
            {errors.region && (
              <p className="text-xs text-rose-600">{errors.region}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wh-address" className="text-[#0E2748]">
              Full address{' '}
              <span className="text-rose-600" aria-hidden="true">
                *
              </span>
            </Label>
            <Textarea
              id="wh-address"
              value={values.address}
              maxLength={500}
              onChange={(event) => setField('address', event.target.value)}
              placeholder="Street, number, district, city"
              aria-invalid={Boolean(errors.address)}
              className={fieldClasses}
            />
            {errors.address && (
              <p className="text-xs text-rose-600">{errors.address}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wh-pic-name" className="text-[#0E2748]">
                PIC name{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="wh-pic-name"
                value={values.picName}
                onChange={(event) => setField('picName', event.target.value)}
                placeholder="e.g. Budi Santoso"
                aria-invalid={Boolean(errors.picName)}
                className={fieldClasses}
              />
              {errors.picName && (
                <p className="text-xs text-rose-600">{errors.picName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-pic-contact" className="text-[#0E2748]">
                PIC contact{' '}
                <span className="font-normal text-[#0E2748]/40">
                  (optional)
                </span>
              </Label>
              <Input
                id="wh-pic-contact"
                value={values.picContact}
                onChange={(event) => setField('picContact', event.target.value)}
                placeholder="Phone or email"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wh-capacity" className="text-[#0E2748]">
              Capacity (units){' '}
              <span className="font-normal text-[#0E2748]/40">(optional)</span>
            </Label>
            <Input
              id="wh-capacity"
              type="number"
              inputMode="numeric"
              min={1}
              value={values.capacity}
              onChange={(event) => setField('capacity', event.target.value)}
              placeholder="e.g. 1500"
              aria-invalid={Boolean(errors.capacity)}
              className={fieldClasses}
            />
            {errors.capacity ? (
              <p className="text-xs text-rose-600">{errors.capacity}</p>
            ) : (
              <p className="text-xs text-[#0E2748]/50">
                How many terminal units this warehouse can hold. Leave empty if
                unknown.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[#0E2748]">
                Active warehouse
              </p>
              <p className="text-xs text-[#0E2748]/50">
                Inactive warehouses stay in the hierarchy but are flagged as out
                of operation.
              </p>
            </div>
            <Switch
              className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
              checked={values.status === 'active'}
              onCheckedChange={(checked) =>
                setField('status', checked ? 'active' : 'inactive')
              }
            />
          </div>
        </form>
      </BaseModal>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
