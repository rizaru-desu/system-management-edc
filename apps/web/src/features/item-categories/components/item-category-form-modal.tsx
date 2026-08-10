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
import { ACCESSORY_CATEGORIES, ITEM_UNITS } from '../data/item-categories.ts'
import type {
  AccessoryCategory,
  ItemCategoryRecord,
  ItemUnit,
} from '../data/item-categories.ts'

export interface ItemCategoryFormValues {
  name: string
  code: string
  /** '' until the user picks one — required, validated on submit. */
  category: AccessoryCategory | ''
  unit: ItemUnit | ''
  description: string
  status: ItemCategoryRecord['status']
}

interface ItemCategoryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  item: ItemCategoryRecord | null
  /**
   * Case-insensitive duplicate check against the current catalogue; the page
   * already excludes the record being edited.
   */
  isNameTaken: (name: string) => boolean
  onSubmit: (values: ItemCategoryFormValues) => void
}

interface FormErrors {
  name?: string
  category?: string
  unit?: string
}

const EMPTY: ItemCategoryFormValues = {
  name: '',
  code: '',
  category: '',
  unit: '',
  description: '',
  status: 'active',
}

export function ItemCategoryFormModal({
  open,
  onOpenChange,
  item,
  isNameTaken,
  onSubmit,
}: ItemCategoryFormModalProps) {
  const [values, setValues] = useState<ItemCategoryFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] =
    useState<ItemCategoryFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = item
        ? {
            name: item.name,
            code: item.code,
            category: item.category,
            unit: item.unit,
            description: item.description,
            status: item.status,
          }
        : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, item])

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

  const setField = <TField extends keyof ItemCategoryFormValues>(
    field: TField,
    value: ItemCategoryFormValues[TField],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field in errors) {
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const name = values.name.trim()
    if (!name) {
      nextErrors.name = 'Item name is required.'
    } else if (isNameTaken(name)) {
      nextErrors.name = 'An item with this name already exists.'
    }
    if (!values.category) {
      nextErrors.category = 'Accessory category is required.'
    }
    if (!values.unit) {
      nextErrors.unit = 'Unit is required.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      name,
      code: values.code.trim(),
      description: values.description.trim(),
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
        size="md"
        disableOutsideClose
        title={item ? 'Edit completeness item' : 'Add completeness item'}
        description={
          item
            ? 'Update the item details in the completeness catalogue.'
            : 'Create an item products can list as standard completeness.'
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
            <Button type="submit" form="item-category-form">
              {item ? 'Save changes' : 'Create item'}
            </Button>
          </>
        }
      >
        <form
          id="item-category-form"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-name" className="text-[#0E2748]">
                Item name{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="item-name"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="e.g. Charger/Adaptor"
                aria-invalid={Boolean(errors.name)}
                className={fieldClasses}
              />
              {errors.name && (
                <p className="text-xs text-rose-600">{errors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-code" className="text-[#0E2748]">
                Item code{' '}
                <span className="font-normal text-[#0E2748]/40">
                  (optional)
                </span>
              </Label>
              <Input
                id="item-code"
                value={values.code}
                onChange={(event) => setField('code', event.target.value)}
                placeholder="e.g. ACC-001"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-category" className="text-[#0E2748]">
                Accessory category{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={values.category}
                onValueChange={(value) =>
                  setField('category', value as AccessoryCategory)
                }
              >
                <SelectTrigger
                  id="item-category"
                  aria-invalid={Boolean(errors.category)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {ACCESSORY_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-rose-600">{errors.category}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-unit" className="text-[#0E2748]">
                Unit{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={values.unit}
                onValueChange={(value) => setField('unit', value as ItemUnit)}
              >
                <SelectTrigger
                  id="item-unit"
                  aria-invalid={Boolean(errors.unit)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-xs text-rose-600">{errors.unit}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-description" className="text-[#0E2748]">
              Description{' '}
              <span className="font-normal text-[#0E2748]/40">(optional)</span>
            </Label>
            <Textarea
              id="item-description"
              value={values.description}
              maxLength={500}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="e.g. Adaptor daya bawaan untuk terminal EDC"
              className={fieldClasses}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[#0E2748]">Active item</p>
              <p className="text-xs text-[#0E2748]/50">
                Inactive items stay in the catalogue but are hidden from the
                product completeness dropdown.
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
