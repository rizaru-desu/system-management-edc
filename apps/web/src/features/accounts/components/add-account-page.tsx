import { useState } from 'react'

import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
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
import {
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
} from '../data/accounts.ts'
import type { AccountStatus } from '../data/accounts.ts'

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

/**
 * Master Data → Add Account. UI-only for now: the form holds its values in
 * local state (same controlled-field pattern as the merchant/service point
 * forms) but is not wired to a backend endpoint yet.
 */
export function AddAccountPage() {
  const [values, setValues] = useState<AccountFormValues>(EMPTY)

  const setField = <TField extends keyof AccountFormValues>(
    field: TField,
    value: AccountFormValues[TField],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Master Data
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Add Account
          </h1>
          <p className="text-sm text-brand-900/60">
            Register a new account — identity, billing profile and the PIC
            contact.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Section 1 — Identity */}
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-semibold tracking-tight text-brand-900">
              Identity
            </h2>
            <p className="text-sm text-brand-900/60">
              Who this account is and how it participates in the network.
            </p>
          </div>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="acc-id" className="text-[#0E2748]">
                  Account ID
                </Label>
                <Input
                  id="acc-id"
                  value={values.accountId}
                  onChange={(event) =>
                    setField('accountId', event.target.value)
                  }
                  placeholder="e.g. ACC-0001"
                  className={fieldClasses}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-name" className="text-[#0E2748]">
                  Account name
                </Label>
                <Input
                  id="acc-name"
                  value={values.accountName}
                  onChange={(event) =>
                    setField('accountName', event.target.value)
                  }
                  placeholder="e.g. PT Maju Bersama"
                  className={fieldClasses}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="acc-type" className="text-[#0E2748]">
                  Account type
                </Label>
                <Select
                  value={values.accountType || undefined}
                  onValueChange={(value) => setField('accountType', value)}
                >
                  <SelectTrigger
                    id="acc-type"
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
          </div>
        </Card>

        {/* Section 2 — Billing */}
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-semibold tracking-tight text-brand-900">
              Billing
            </h2>
            <p className="text-sm text-brand-900/60">
              Invoicing details — the billed entity, tax registration and
              billing address.
            </p>
          </div>
          <div className="space-y-5">
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
          </div>
        </Card>

        {/* Section 3 — PIC Contact */}
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-semibold tracking-tight text-brand-900">
              PIC Contact
            </h2>
            <p className="text-sm text-brand-900/60">
              The person in charge we reach out to for this account.
            </p>
          </div>
          <div className="space-y-5">
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
                  className={fieldClasses}
                />
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
                className={fieldClasses}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setValues(EMPTY)}
          >
            Reset
          </Button>
          <Button type="submit">Create account</Button>
        </div>
      </form>
    </div>
  )
}
