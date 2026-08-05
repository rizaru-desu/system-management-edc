import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Mail, MailCheck, ShieldAlert } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { cn } from '#/lib/utils.ts'
import { requestPasswordReset } from '../api/password-reset.ts'
import { getAuthErrorMessage } from '../lib/auth-error.ts'
import { isLdapEmail } from '../lib/is-ldap-email.ts'
import { forgotPasswordSchema } from '../schemas/password-reset.schema.ts'
import type { ForgotPasswordInput } from '../schemas/password-reset.schema.ts'
import { authInputClassName } from './auth-field.ts'
import { AuthShell } from './auth-shell.tsx'
import { FieldError } from './field-error.tsx'

const defaultValues: ForgotPasswordInput = { email: '' }

const backToSignIn = (
  <Link
    to="/login"
    className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#3F6FA8] no-underline hover:text-[#0E2748]"
  >
    <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
    Back to sign in
  </Link>
)

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  // AD/LDAP address the user last submitted — their passwords are managed in
  // the directory, so the request never reaches the API.
  const [ldapEmail, setLdapEmail] = useState<string | null>(null)

  const request = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (_data, email) => setSentTo(email),
  })

  const form = useForm({
    defaultValues,
    validators: {
      onBlur: forgotPasswordSchema,
      onSubmit: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setLdapEmail(null)
      if (isLdapEmail(value.email)) {
        setLdapEmail(value.email)
        return
      }
      // Failures surface through `request.error` below.
      await request.mutateAsync(value.email).catch(() => undefined)
    },
  })

  if (sentTo) {
    return (
      <AuthShell kicker="Reset password" title="Check your inbox">
        <div className="mt-8 rounded-xl border border-[#DDE0EC] bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3F6FA8]/10">
            <MailCheck className="h-5 w-5 text-[#3F6FA8]" strokeWidth={1.75} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#0E2748]/70">
            If an account exists for{' '}
            <strong className="font-semibold text-[#0E2748]">{sentTo}</strong>,
            a password reset link is on its way. The link stays valid for 1
            hour.
          </p>
        </div>
        {backToSignIn}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      kicker="Reset password"
      title="Forgot your password?"
      description="Enter your work email and we'll send you a link to set a new one."
    >
      <form
        noValidate
        method="post"
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label
                htmlFor={field.name}
                className="text-xs font-semibold text-[#0E2748]"
              >
                Work Email
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                  strokeWidth={1.75}
                />
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className={cn(authInputClassName, 'pl-10')}
                />
              </div>
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        {ldapEmail && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              strokeWidth={1.75}
            />
            <p className="text-sm leading-relaxed text-amber-800">
              This account signs in through Active Directory, so its password
              can&apos;t be reset here. Contact your IT team to change it.
            </p>
          </div>
        )}

        {request.isError && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {getAuthErrorMessage(request.error)}
          </p>
        )}

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full font-semibold transition-all"
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
          )}
        </form.Subscribe>
      </form>
      {backToSignIn}
    </AuthShell>
  )
}
