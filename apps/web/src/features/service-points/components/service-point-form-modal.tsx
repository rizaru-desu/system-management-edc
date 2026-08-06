import { useEffect, useState } from 'react'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
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
import type { ServicePointRecord } from '../data/service-points.ts'
import type { ParentOption } from '../lib/tree.ts'

/** Sentinel for "no parent" — Radix Select items may not use an empty value. */
const NO_PARENT = 'none'

export interface ServicePointFormValues {
  code: string
  name: string
  parentId: string | null
  region: string
  address: string
  phone: string
  email: string
  latitude: string
  longitude: string
  status: ServicePointRecord['status']
  notes: string
}

interface ServicePointFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  servicePoint: ServicePointRecord | null
  /**
   * Valid parent choices in tree order. The page pre-excludes the edited
   * record and its descendants (a service point cannot be its own ancestor).
   */
  parentOptions: Array<ParentOption>
  onSubmit: (values: ServicePointFormValues) => void
}

interface FormErrors {
  code?: string
  name?: string
  parentId?: string
  email?: string
  latitude?: string
  longitude?: string
}

const EMPTY: ServicePointFormValues = {
  code: '',
  name: '',
  parentId: null,
  region: '',
  address: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  status: 'active',
  notes: '',
}

/** Parses an optional coordinate; empty is fine, non-numeric/out-of-range is not. */
function coordinateError(
  raw: string,
  bound: number,
  label: string,
): string | undefined {
  if (!raw.trim()) return undefined
  const value = Number(raw)
  if (Number.isNaN(value)) return `${label} must be a number.`
  if (Math.abs(value) > bound) {
    return `${label} must be between -${bound} and ${bound}.`
  }
  return undefined
}

export function ServicePointFormModal({
  open,
  onOpenChange,
  servicePoint,
  parentOptions,
  onSubmit,
}: ServicePointFormModalProps) {
  const [values, setValues] = useState<ServicePointFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      setValues(
        servicePoint
          ? {
              code: servicePoint.code,
              name: servicePoint.name,
              parentId: servicePoint.parentId,
              region: servicePoint.region ?? '',
              address: servicePoint.address ?? '',
              phone: servicePoint.phone ?? '',
              email: servicePoint.email ?? '',
              latitude:
                servicePoint.latitude === null
                  ? ''
                  : String(servicePoint.latitude),
              longitude:
                servicePoint.longitude === null
                  ? ''
                  : String(servicePoint.longitude),
              status: servicePoint.status,
              notes: servicePoint.notes ?? '',
            }
          : EMPTY,
      )
      setErrors({})
    }
  }, [open, servicePoint])

  const setField = <TField extends keyof ServicePointFormValues>(
    field: TField,
    value: ServicePointFormValues[TField],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field in errors) {
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!values.code.trim()) {
      nextErrors.code = 'Service point code is required.'
    }
    if (!values.name.trim()) {
      nextErrors.name = 'Service point name is required.'
    }
    // The options list already excludes the record and its subtree; this
    // guards the invariant anyway in case the selection went stale.
    if (servicePoint && values.parentId === servicePoint.id) {
      nextErrors.parentId = 'A service point cannot be its own parent.'
    }
    if (
      values.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(values.email.trim())
    ) {
      nextErrors.email = 'Enter a valid email address.'
    }
    const latitudeError = coordinateError(values.latitude, 90, 'Latitude')
    if (latitudeError) nextErrors.latitude = latitudeError
    const longitudeError = coordinateError(values.longitude, 180, 'Longitude')
    if (longitudeError) nextErrors.longitude = longitudeError

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      region: values.region.trim(),
      address: values.address.trim(),
      phone: values.phone.trim(),
      email: values.email.trim().toLowerCase(),
      latitude: values.latitude.trim(),
      longitude: values.longitude.trim(),
      notes: values.notes.trim(),
    })
    onOpenChange(false)
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light max-h-[90vh] overflow-y-auto border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
            {servicePoint ? 'Edit service point' : 'Add service point'}
          </DialogTitle>
          <DialogDescription className="text-[#0E2748]/60">
            {servicePoint
              ? 'Update the service point details and its place in the hierarchy.'
              : 'Create a service point and choose where it sits in the hierarchy.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-code" className="text-[#0E2748]">
                Service point code{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="sp-code"
                value={values.code}
                onChange={(event) => setField('code', event.target.value)}
                placeholder="e.g. SP-JKT-005"
                aria-invalid={Boolean(errors.code)}
                className={fieldClasses}
              />
              {errors.code && (
                <p className="text-xs text-rose-600">{errors.code}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-name" className="text-[#0E2748]">
                Service point name{' '}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="sp-name"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="e.g. Jakarta Selatan"
                aria-invalid={Boolean(errors.name)}
                className={fieldClasses}
              />
              {errors.name && (
                <p className="text-xs text-rose-600">{errors.name}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-parent" className="text-[#0E2748]">
                Parent service point
              </Label>
              <Select
                value={values.parentId ?? NO_PARENT}
                onValueChange={(value) =>
                  setField('parentId', value === NO_PARENT ? null : value)
                }
              >
                <SelectTrigger
                  id="sp-parent"
                  aria-invalid={Boolean(errors.parentId)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="No parent (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>
                    No parent (top level)
                  </SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {/* Figure-space indent mirrors the tree depth. */}
                      {'  '.repeat(option.depth)}
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.parentId ? (
                <p className="text-xs text-rose-600">{errors.parentId}</p>
              ) : (
                servicePoint && (
                  <p className="text-xs text-[#0E2748]/50">
                    This service point and everything under it are excluded to
                    keep the hierarchy free of cycles.
                  </p>
                )
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-region" className="text-[#0E2748]">
                Region
              </Label>
              <Input
                id="sp-region"
                value={values.region}
                onChange={(event) => setField('region', event.target.value)}
                placeholder="e.g. DKI Jakarta"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-address" className="text-[#0E2748]">
              Address
            </Label>
            <Input
              id="sp-address"
              value={values.address}
              onChange={(event) => setField('address', event.target.value)}
              placeholder="Street, number, city"
              className={fieldClasses}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-phone" className="text-[#0E2748]">
                Phone
              </Label>
              <Input
                id="sp-phone"
                type="tel"
                value={values.phone}
                onChange={(event) => setField('phone', event.target.value)}
                placeholder="e.g. +62 21 5150 000"
                className={fieldClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-email" className="text-[#0E2748]">
                Email
              </Label>
              <Input
                id="sp-email"
                type="email"
                value={values.email}
                onChange={(event) => setField('email', event.target.value)}
                placeholder="e.g. jaksel@edc.co.id"
                aria-invalid={Boolean(errors.email)}
                className={fieldClasses}
              />
              {errors.email && (
                <p className="text-xs text-rose-600">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-latitude" className="text-[#0E2748]">
                Latitude
              </Label>
              <Input
                id="sp-latitude"
                inputMode="decimal"
                value={values.latitude}
                onChange={(event) => setField('latitude', event.target.value)}
                placeholder="e.g. -6.2907"
                aria-invalid={Boolean(errors.latitude)}
                className={fieldClasses}
              />
              {errors.latitude && (
                <p className="text-xs text-rose-600">{errors.latitude}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-longitude" className="text-[#0E2748]">
                Longitude
              </Label>
              <Input
                id="sp-longitude"
                inputMode="decimal"
                value={values.longitude}
                onChange={(event) => setField('longitude', event.target.value)}
                placeholder="e.g. 106.8018"
                aria-invalid={Boolean(errors.longitude)}
                className={fieldClasses}
              />
              {errors.longitude && (
                <p className="text-xs text-rose-600">{errors.longitude}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[#0E2748]">
                Active service point
              </p>
              <p className="text-xs text-[#0E2748]/50">
                Inactive service points stay in the hierarchy but are flagged
                as out of operation.
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

          <div className="space-y-1.5">
            <Label htmlFor="sp-notes" className="text-[#0E2748]">
              Notes{' '}
              <span className="font-normal text-[#0E2748]/40">(optional)</span>
            </Label>
            <Input
              id="sp-notes"
              value={values.notes}
              maxLength={500}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="e.g. Pilot area for dense-merchant coverage"
              className={fieldClasses}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {servicePoint ? 'Save changes' : 'Create service point'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
