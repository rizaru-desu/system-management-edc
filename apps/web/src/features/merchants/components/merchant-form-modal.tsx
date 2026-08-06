import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogBody,
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
import { UnsavedChangesDialog } from '#/components/UnsavedChangesDialog.tsx'
import { useUnsavedChanges } from '#/hooks/use-unsaved-changes.ts'
import { MERCHANT_TYPE_OPTIONS } from '../data/merchants.ts'
import type { MerchantRecord } from '../data/merchants.ts'

/** Sentinel for "no type" — Radix Select items may not use an empty value. */
const NO_TYPE = 'none'

/** Service point choice served by the backend catalogue. */
export interface ServicePointOption {
  id: string
  code: string
  name: string
}

export interface MerchantFormValues {
  code: string
  name: string
  /** Free-text type label; '' = not set. */
  type: string
  picName: string
  phone: string
  email: string
  address: string
  province: string
  city: string
  district: string
  postalCode: string
  latitude: string
  longitude: string
  servicePointId: string
  status: MerchantRecord['status']
}

interface MerchantFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  merchant: MerchantRecord | null
  /** Live service point catalogue from the backend (never hardcoded). */
  servicePointOptions: Array<ServicePointOption>
  /** Disables Save while the create/update mutation is in flight. */
  saving: boolean
  /** Bumped by the page on every duplicate-code 409 from the backend. */
  duplicateConflict: number
  onSubmit: (values: MerchantFormValues) => void
}

interface FormErrors {
  code?: string
  name?: string
  phone?: string
  email?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  servicePointId?: string
}

const EMPTY: MerchantFormValues = {
  code: '',
  name: '',
  type: '',
  picName: '',
  phone: '',
  email: '',
  address: '',
  province: '',
  city: '',
  district: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  servicePointId: '',
  status: 'active',
}

/** Digits with optional +, spaces, dashes or parentheses; 8–20 digits. */
const PHONE_PATTERN = /^\+?[\d\s()-]*\d[\d\s()-]*$/

function phoneError(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const digits = value.replace(/\D/g, '')
  if (!PHONE_PATTERN.test(value) || digits.length < 8 || digits.length > 20) {
    return 'Enter a valid phone number (e.g. +62 812 3456 7890).'
  }
  return undefined
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

export function MerchantFormModal({
  open,
  onOpenChange,
  merchant,
  servicePointOptions,
  saving,
  duplicateConflict,
  onSubmit,
}: MerchantFormModalProps) {
  const [values, setValues] = useState<MerchantFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] = useState<MerchantFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = merchant
        ? {
            code: merchant.code,
            name: merchant.name,
            type: merchant.type ?? '',
            picName: merchant.picName ?? '',
            phone: merchant.phone ?? '',
            email: merchant.email ?? '',
            address: merchant.address ?? '',
            province: merchant.province ?? '',
            city: merchant.city ?? '',
            district: merchant.district ?? '',
            postalCode: merchant.postalCode ?? '',
            latitude:
              merchant.latitude === null ? '' : String(merchant.latitude),
            longitude:
              merchant.longitude === null ? '' : String(merchant.longitude),
            servicePointId: merchant.servicePointId,
            status: merchant.status,
          }
        : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, merchant])

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
        code: 'Merchant code is already in use.',
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

  const setField = <TField extends keyof MerchantFormValues>(
    field: TField,
    value: MerchantFormValues[TField],
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
    if (!values.code.trim()) {
      nextErrors.code = 'Merchant code is required.'
    }
    if (!values.name.trim()) {
      nextErrors.name = 'Merchant name is required.'
    }
    if (!values.servicePointId) {
      nextErrors.servicePointId = 'Service point is required.'
    }
    const phoneValidation = phoneError(values.phone)
    if (phoneValidation) nextErrors.phone = phoneValidation
    if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (values.postalCode.trim() && !/^\d{5}$/.test(values.postalCode.trim())) {
      nextErrors.postalCode = 'Postal code must be 5 digits.'
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
      picName: values.picName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim().toLowerCase(),
      address: values.address.trim(),
      province: values.province.trim(),
      city: values.city.trim(),
      district: values.district.trim(),
      postalCode: values.postalCode.trim(),
      latitude: values.latitude.trim(),
      longitude: values.longitude.trim(),
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Backdrop clicks never dismiss the form — closing goes through the
          "X" button, Cancel, or a successful save (all guarded against
          unsaved changes). Header and footer stay pinned; only the field
          list inside DialogBody scrolls. */}
        <DialogContent
          disableOutsideClose
          className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              {merchant ? 'Edit merchant' : 'Add merchant'}
            </DialogTitle>
            <DialogDescription className="text-[#0E2748]/60">
              {merchant
                ? 'Update the merchant profile, location details and owning service point.'
                : 'Register a merchant and assign it to the service point that will serve it.'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col gap-4"
            noValidate
          >
            <DialogBody className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mch-code" className="text-[#0E2748]">
                    Merchant code {requiredMark}
                  </Label>
                  <Input
                    id="mch-code"
                    value={values.code}
                    onChange={(event) => setField('code', event.target.value)}
                    placeholder="e.g. MCH-TGS-027"
                    aria-invalid={Boolean(errors.code)}
                    className={fieldClasses}
                  />
                  {errors.code && (
                    <p className="text-xs text-rose-600">{errors.code}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mch-name" className="text-[#0E2748]">
                    Merchant name {requiredMark}
                  </Label>
                  <Input
                    id="mch-name"
                    value={values.name}
                    onChange={(event) => setField('name', event.target.value)}
                    placeholder="e.g. Indomaret Pondok Aren"
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
                  <Label htmlFor="mch-type" className="text-[#0E2748]">
                    Merchant type
                  </Label>
                  <Select
                    value={values.type || NO_TYPE}
                    onValueChange={(value) =>
                      setField('type', value === NO_TYPE ? '' : value)
                    }
                  >
                    <SelectTrigger
                      id="mch-type"
                      className={`w-full ${fieldClasses}`}
                    >
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TYPE}>No type</SelectItem>
                      {MERCHANT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      {/* An edited record may carry a type outside the
                      suggested list (free text server-side) — keep it
                      selectable so editing never silently drops it. */}
                      {values.type &&
                        !MERCHANT_TYPE_OPTIONS.includes(
                          values.type as (typeof MERCHANT_TYPE_OPTIONS)[number],
                        ) && (
                          <SelectItem value={values.type}>
                            {values.type}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mch-pic" className="text-[#0E2748]">
                    PIC name
                  </Label>
                  <Input
                    id="mch-pic"
                    value={values.picName}
                    onChange={(event) =>
                      setField('picName', event.target.value)
                    }
                    placeholder="e.g. Budi Santoso"
                    className={fieldClasses}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mch-phone" className="text-[#0E2748]">
                    Phone number
                  </Label>
                  <Input
                    id="mch-phone"
                    type="tel"
                    value={values.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="e.g. +62 812 3456 7890"
                    aria-invalid={Boolean(errors.phone)}
                    className={fieldClasses}
                  />
                  {errors.phone && (
                    <p className="text-xs text-rose-600">{errors.phone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mch-email" className="text-[#0E2748]">
                    Email
                  </Label>
                  <Input
                    id="mch-email"
                    type="email"
                    value={values.email}
                    onChange={(event) => setField('email', event.target.value)}
                    placeholder="e.g. store@merchant.co.id"
                    aria-invalid={Boolean(errors.email)}
                    className={fieldClasses}
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mch-address" className="text-[#0E2748]">
                  Address
                </Label>
                <Input
                  id="mch-address"
                  value={values.address}
                  onChange={(event) => setField('address', event.target.value)}
                  placeholder="Street, number, building"
                  className={fieldClasses}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mch-province" className="text-[#0E2748]">
                    Province
                  </Label>
                  <Input
                    id="mch-province"
                    value={values.province}
                    onChange={(event) =>
                      setField('province', event.target.value)
                    }
                    placeholder="e.g. Banten"
                    className={fieldClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mch-city" className="text-[#0E2748]">
                    City
                  </Label>
                  <Input
                    id="mch-city"
                    value={values.city}
                    onChange={(event) => setField('city', event.target.value)}
                    placeholder="e.g. Tangerang Selatan"
                    className={fieldClasses}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mch-district" className="text-[#0E2748]">
                    District
                  </Label>
                  <Input
                    id="mch-district"
                    value={values.district}
                    onChange={(event) =>
                      setField('district', event.target.value)
                    }
                    placeholder="e.g. Pondok Aren"
                    className={fieldClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mch-postal" className="text-[#0E2748]">
                    Postal code
                  </Label>
                  <Input
                    id="mch-postal"
                    inputMode="numeric"
                    value={values.postalCode}
                    onChange={(event) =>
                      setField('postalCode', event.target.value)
                    }
                    placeholder="e.g. 15224"
                    aria-invalid={Boolean(errors.postalCode)}
                    className={fieldClasses}
                  />
                  {errors.postalCode && (
                    <p className="text-xs text-rose-600">{errors.postalCode}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mch-latitude" className="text-[#0E2748]">
                    Latitude
                  </Label>
                  <Input
                    id="mch-latitude"
                    inputMode="decimal"
                    value={values.latitude}
                    onChange={(event) =>
                      setField('latitude', event.target.value)
                    }
                    placeholder="e.g. -6.2711"
                    aria-invalid={Boolean(errors.latitude)}
                    className={fieldClasses}
                  />
                  {errors.latitude && (
                    <p className="text-xs text-rose-600">{errors.latitude}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mch-longitude" className="text-[#0E2748]">
                    Longitude
                  </Label>
                  <Input
                    id="mch-longitude"
                    inputMode="decimal"
                    value={values.longitude}
                    onChange={(event) =>
                      setField('longitude', event.target.value)
                    }
                    placeholder="e.g. 106.7146"
                    aria-invalid={Boolean(errors.longitude)}
                    className={fieldClasses}
                  />
                  {errors.longitude && (
                    <p className="text-xs text-rose-600">{errors.longitude}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mch-service-point" className="text-[#0E2748]">
                  Service point {requiredMark}
                </Label>
                <Select
                  value={values.servicePointId || undefined}
                  onValueChange={(value) => setField('servicePointId', value)}
                >
                  <SelectTrigger
                    id="mch-service-point"
                    aria-invalid={Boolean(errors.servicePointId)}
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue placeholder="Select the owning service point" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicePointOptions.map((servicePoint) => (
                      <SelectItem key={servicePoint.id} value={servicePoint.id}>
                        {servicePoint.name} ({servicePoint.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.servicePointId && (
                  <p className="text-xs text-rose-600">
                    {errors.servicePointId}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[#0E2748]">
                    Active merchant
                  </p>
                  <p className="text-xs text-[#0E2748]/50">
                    Inactive merchants stay in the catalogue but are excluded
                    from terminal deployments.
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
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={1.75}
                  />
                )}
                {merchant ? 'Save changes' : 'Create merchant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
