import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { UnsavedChangesDialog } from '#/components/UnsavedChangesDialog.tsx'
import { useUnsavedChanges } from '#/hooks/use-unsaved-changes.ts'
import type { PaymentMethodRecord } from '../data/payment-methods.ts'

export interface PaymentMethodFormValues {
  name: string
  code: string
  description: string
  status: PaymentMethodRecord['status']
}

interface PaymentMethodFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  method: PaymentMethodRecord | null
  /** True while the create/update mutation is in flight. */
  saving: boolean
  /**
   * Bumped by the page on every duplicate-name 409 from the backend, so
   * the Name field highlights inline without losing the entered values.
   */
  duplicateNameConflict: number
  /** Same as {@link duplicateNameConflict}, for the Code field. */
  duplicateCodeConflict: number
  onSubmit: (values: PaymentMethodFormValues) => void
}

interface FormErrors {
  name?: string
  code?: string
}

const EMPTY: PaymentMethodFormValues = {
  name: '',
  code: '',
  description: '',
  status: 'active',
}

/**
 * Create/edit form of one payment method (Administration → Payment
 * Methods). Uniqueness of the name and code is enforced by the backend;
 * the page bumps the conflict counters so a 409 highlights the offending
 * field without losing input.
 */
export function PaymentMethodFormModal({
  open,
  onOpenChange,
  method,
  saving,
  duplicateNameConflict,
  duplicateCodeConflict,
  onSubmit,
}: PaymentMethodFormModalProps) {
  const [values, setValues] = useState<PaymentMethodFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] =
    useState<PaymentMethodFormValues>(EMPTY)

  // Re-seed the fields whenever the modal opens (create vs edit).
  useEffect(() => {
    if (!open) return
    const next = method
      ? {
          name: method.name,
          code: method.code,
          description: method.description,
          status: method.status,
        }
      : EMPTY
    setValues(next)
    setInitialValues(next)
    setErrors({})
  }, [open, method])

  // A duplicate-name/code 409 from the backend highlights the field inline.
  useEffect(() => {
    if (duplicateNameConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        name: 'A payment method with this name already exists.',
      }))
    }
  }, [duplicateNameConflict])

  useEffect(() => {
    if (duplicateCodeConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        code: 'A payment method with this code already exists.',
      }))
    }
  }, [duplicateCodeConflict])

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValues) && !saving

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

  const patch = (partial: Partial<PaymentMethodFormValues>) => {
    setValues((previous) => ({ ...previous, ...partial }))
  }

  const handleSubmit = () => {
    if (saving) return
    const nextErrors: FormErrors = {}
    if (!values.name.trim()) nextErrors.name = 'The name is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      name: values.name.trim(),
      code: values.code.trim(),
      description: values.description.trim(),
      status: values.status,
    })
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={handleOpenChange}
        title={method ? 'Edit Payment Method' : 'Add Payment Method'}
        description={
          method
            ? 'Update this payment method.'
            : 'Add a payment type products can support — it will feed the transaction test checklist later.'
        }
        loading={saving}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
              {method ? 'Save changes' : 'Add method'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment-method-name">Name</Label>
            <Input
              id="payment-method-name"
              value={values.name}
              onChange={(event) => {
                patch({ name: event.target.value })
                setErrors((previous) => ({ ...previous, name: undefined }))
              }}
              placeholder="e.g. QRIS"
              aria-invalid={Boolean(errors.name)}
              className={fieldClasses}
            />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-method-code">Code (optional)</Label>
            <Input
              id="payment-method-code"
              value={values.code}
              onChange={(event) => {
                patch({ code: event.target.value })
                setErrors((previous) => ({ ...previous, code: undefined }))
              }}
              placeholder="e.g. PAY-001"
              aria-invalid={Boolean(errors.code)}
              className={fieldClasses}
            />
            {errors.code && (
              <p className="text-xs text-rose-600">{errors.code}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-method-description">
              Description (optional)
            </Label>
            <Textarea
              id="payment-method-description"
              value={values.description}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder="What this payment type covers…"
              rows={3}
              className={fieldClasses}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-brand-900">
                Active status
              </p>
              <p className="text-xs text-brand-900/50">
                Inactive methods stay linked but disappear from new product
                dropdowns.
              </p>
            </div>
            <Switch
              checked={values.status === 'active'}
              aria-label="Toggle active status"
              onCheckedChange={(checked) =>
                patch({ status: checked ? 'active' : 'inactive' })
              }
            />
          </div>
        </div>
      </BaseModal>

      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
