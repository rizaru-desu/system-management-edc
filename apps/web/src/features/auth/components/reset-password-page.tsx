import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Eye, EyeOff, Lock, TriangleAlert } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { cn } from '#/lib/utils.ts'
import { resetPassword } from '../api/password-reset.ts'
import { getAuthErrorMessage } from '../lib/auth-error.ts'
import { resetPasswordSchema } from '../schemas/password-reset.schema.ts'
import type { ResetPasswordInput } from '../schemas/password-reset.schema.ts'
import { authInputClassName } from './auth-field.ts'
import { AuthShell } from './auth-shell.tsx'
import { FieldError } from './field-error.tsx'

const defaultValues: ResetPasswordInput = {
  newPassword: '',
  confirmPassword: '',
}

interface ResetPasswordPageProps {
  /** Reset token from the emailed link (`?token=`); absent when invalid. */
  token?: string
  /** `?error=INVALID_TOKEN` set by the backend redirect on a bad link. */
  error?: string
}

export function ResetPasswordPage({ token, error }: ResetPasswordPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const reset = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => navigate({ to: '/login', search: { reset: true } }),
  })

  const form = useForm({
    defaultValues,
    validators: {
      onBlur: resetPasswordSchema,
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      if (!token) return
      // Failures surface through `reset.error` below.
      await reset
        .mutateAsync({ newPassword: value.newPassword, token })
        .catch(() => undefined)
    },
  })

  // The backend redirects here with ?error=INVALID_TOKEN for expired/used
  // links; a missing token means the URL was mangled or visited directly.
  if (!token || error) {
    return (
      <AuthShell
        kicker="Reset password"
        title="This link has expired"
        description="Password reset links stay valid for 1 hour and can only be used once."
      >
        <div className="mt-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            strokeWidth={1.75}
          />
          <p className="text-sm leading-relaxed text-amber-800">
            Request a new reset link and use it within the hour.
          </p>
        </div>
        <Button asChild className="mt-6 h-11 w-full font-semibold">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#3F6FA8] no-underline hover:text-[#0E2748]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      kicker="Reset password"
      title="Set a new password"
      description="Choose a new password for your account. You'll be signed out everywhere else."
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
        <form.Field name="newPassword">
          {(field) => (
            <div className="space-y-2">
              <Label
                htmlFor={field.name}
                className="text-xs font-semibold text-[#0E2748]"
              >
                New Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                  strokeWidth={1.75}
                />
                <Input
                  id={field.name}
                  name={field.name}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className={cn(authInputClassName, 'pl-10 pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => (
            <div className="space-y-2">
              <Label
                htmlFor={field.name}
                className="text-xs font-semibold text-[#0E2748]"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                  strokeWidth={1.75}
                />
                <Input
                  id={field.name}
                  name={field.name}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
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

        {reset.isError && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {getAuthErrorMessage(reset.error)}
          </p>
        )}

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full font-semibold transition-all"
            >
              {isSubmitting ? 'Saving…' : 'Save new password'}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthShell>
  )
}
