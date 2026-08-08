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
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '../data/accounts.ts'
import type { AccountRecord, AccountStatus } from '../data/accounts.ts'

export interface AccountFormValues {
  accountId: string
  accountName: string
  /** Account type label; '' = not chosen yet. */
  accountType: string
  status: AccountStatus
  billingName: string
  taxId: string
  billingAddress: string
  city: string
  region: string
  picName: string
  picPhone: string
  picEmail: string
}

interface AccountFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  account: AccountRecord | null
  /** Disables Save while the create/update mutation is in flight. */
  saving: boolean
  /** Bumped by the page on every duplicate-id 409 from the backend. */
  duplicateConflict: number
  onSubmit: (values: AccountFormValues) => void
}

interface FormErrors {
  accountId?: string
  accountName?: string
  accountType?: string
  picPhone?: string
  picEmail?: string
}

const EMPTY: AccountFormValues = {
  accountId: '',
  accountName: '',
  accountType: '',
  status: 'active',
  billingName: '',
  taxId: '',
  billingAddress: '',
  city: '',
  region: '',
  picName: '',
  picPhone: '',
  picEmail: '',
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

/** Section heading separating the identity/billing/PIC blocks. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-brand-100 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-900/45">
      {children}
    </p>
  )
}

/**
 * Add/Edit account modal for the Contract Management → Account list. The
 * same controlled-field pattern as the merchant form modal, with the form
 * grouped into Identity / Billing / PIC Contact sections.
 */
export function AccountFormModal({
  open,
  onOpenChange,
  account,
  saving,
  duplicateConflict,
  onSubmit,
}: AccountFormModalProps) {
  const [values, setValues] = useState<AccountFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] = useState<AccountFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = account
        ? {
            accountId: account.accountId,
            accountName: account.name,
            accountType: account.type,
            status: account.status,
            billingName: account.billingName ?? '',
            taxId: account.taxId ?? '',
            billingAddress: account.billingAddress ?? '',
            city: account.city ?? '',
            region: account.region ?? '',
            picName: account.picName ?? '',
            picPhone: account.picPhone ?? '',
            picEmail: account.picEmail ?? '',
          }
        : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, account])

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const { guard, dialogProps } = useUnsavedChanges({ when: open && isDirty })

  // A duplicate-id 409 from the backend highlights the Account ID field
  // inline while the toast carries the same message — the entered values
  // survive.
  useEffect(() => {
    if (duplicateConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        accountId: 'Account ID is already in use.',
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

  const setField = <TField extends keyof AccountFormValues>(
    field: TField,
    value: AccountFormValues[TField],
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
    const trimmedId = values.accountId.trim()
    if (!trimmedId) {
      nextErrors.accountId = 'Account ID is required.'
    }
    if (!values.accountName.trim()) {
      nextErrors.accountName = 'Account name is required.'
    }
    if (!values.accountType) {
      nextErrors.accountType = 'Account type is required.'
    }
    const phoneValidation = phoneError(values.picPhone)
    if (phoneValidation) nextErrors.picPhone = phoneValidation
    if (
      values.picEmail.trim() &&
      !/^\S+@\S+\.\S+$/.test(values.picEmail.trim())
    ) {
      nextErrors.picEmail = 'Enter a valid email address.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      accountId: trimmedId,
      accountName: values.accountName.trim(),
      billingName: values.billingName.trim(),
      taxId: values.taxId.trim(),
      billingAddress: values.billingAddress.trim(),
      city: values.city.trim(),
      region: values.region.trim(),
      picName: values.picName.trim(),
      picPhone: values.picPhone.trim(),
      picEmail: values.picEmail.trim().toLowerCase(),
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
        title={account ? 'Edit account' : 'Add account'}
        description={
          account
            ? 'Update the account identity, billing profile and PIC contact.'
            : 'Register an account with its billing profile and PIC contact.'
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
            <Button type="submit" form="account-form" disabled={saving}>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
              {account ? 'Save changes' : 'Create account'}
            </Button>
          </>
        }
      >
        <form
          id="account-form"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          {/* Section 1 — Identity */}
          <SectionTitle>Identity</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-id" className="text-[#0E2748]">
                Account ID {requiredMark}
              </Label>
              <Input
                id="acc-id"
                value={values.accountId}
                onChange={(event) => setField('accountId', event.target.value)}
                placeholder="e.g. ACC-0001"
                aria-invalid={Boolean(errors.accountId)}
                className={fieldClasses}
              />
              {errors.accountId && (
                <p className="text-xs text-rose-600">{errors.accountId}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-name" className="text-[#0E2748]">
                Account name {requiredMark}
              </Label>
              <Input
                id="acc-name"
                value={values.accountName}
                onChange={(event) =>
                  setField('accountName', event.target.value)
                }
                placeholder="e.g. PT Maju Bersama"
                aria-invalid={Boolean(errors.accountName)}
                className={fieldClasses}
              />
              {errors.accountName && (
                <p className="text-xs text-rose-600">{errors.accountName}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-type" className="text-[#0E2748]">
                Account type {requiredMark}
              </Label>
              <Select
                value={values.accountType || undefined}
                onValueChange={(value) => setField('accountType', value)}
              >
                <SelectTrigger
                  id="acc-type"
                  aria-invalid={Boolean(errors.accountType)}
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select an account type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountType && (
                <p className="text-xs text-rose-600">{errors.accountType}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-status" className="text-[#0E2748]">
                Status
              </Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  setField('status', value as AccountStatus)
                }
              >
                <SelectTrigger
                  id="acc-status"
                  className={`w-full ${fieldClasses}`}
                >
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2 — Billing */}
          <SectionTitle>Billing</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-billing-name" className="text-[#0E2748]">
                Billing name
              </Label>
              <Input
                id="acc-billing-name"
                value={values.billingName}
                onChange={(event) =>
                  setField('billingName', event.target.value)
                }
                placeholder="e.g. PT Maju Bersama Tbk"
                className={fieldClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-tax-id" className="text-[#0E2748]">
                Tax ID / NPWP
              </Label>
              <Input
                id="acc-tax-id"
                value={values.taxId}
                onChange={(event) => setField('taxId', event.target.value)}
                placeholder="e.g. 01.234.567.8-901.000"
                className={fieldClasses}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-billing-address" className="text-[#0E2748]">
              Billing address
            </Label>
            <Textarea
              id="acc-billing-address"
              value={values.billingAddress}
              onChange={(event) =>
                setField('billingAddress', event.target.value)
              }
              placeholder="Street, number, building"
              className={fieldClasses}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-city" className="text-[#0E2748]">
                City
              </Label>
              <Input
                id="acc-city"
                value={values.city}
                onChange={(event) => setField('city', event.target.value)}
                placeholder="e.g. Tangerang Selatan"
                className={fieldClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-region" className="text-[#0E2748]">
                Region
              </Label>
              <Input
                id="acc-region"
                value={values.region}
                onChange={(event) => setField('region', event.target.value)}
                placeholder="e.g. Banten"
                className={fieldClasses}
              />
            </div>
          </div>

          {/* Section 3 — PIC Contact */}
          <SectionTitle>PIC Contact</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-pic-name" className="text-[#0E2748]">
                PIC name
              </Label>
              <Input
                id="acc-pic-name"
                value={values.picName}
                onChange={(event) => setField('picName', event.target.value)}
                placeholder="e.g. Budi Santoso"
                className={fieldClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-pic-phone" className="text-[#0E2748]">
                PIC phone
              </Label>
              <Input
                id="acc-pic-phone"
                type="tel"
                value={values.picPhone}
                onChange={(event) => setField('picPhone', event.target.value)}
                placeholder="e.g. +62 812 3456 7890"
                aria-invalid={Boolean(errors.picPhone)}
                className={fieldClasses}
              />
              {errors.picPhone && (
                <p className="text-xs text-rose-600">{errors.picPhone}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-pic-email" className="text-[#0E2748]">
              PIC email
            </Label>
            <Input
              id="acc-pic-email"
              type="email"
              value={values.picEmail}
              onChange={(event) => setField('picEmail', event.target.value)}
              placeholder="e.g. pic@account.co.id"
              aria-invalid={Boolean(errors.picEmail)}
              className={fieldClasses}
            />
            {errors.picEmail && (
              <p className="text-xs text-rose-600">{errors.picEmail}</p>
            )}
          </div>
        </form>
      </BaseModal>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
