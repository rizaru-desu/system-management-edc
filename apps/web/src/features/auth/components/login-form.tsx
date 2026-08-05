import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { cn } from '#/lib/utils.ts'
import { useSignIn } from '../hooks/use-sign-in.ts'
import { getAuthErrorMessage } from '../lib/auth-error.ts'
import { loginSchema } from '../schemas/login.schema.ts'
import type { LoginInput } from '../schemas/login.schema.ts'
import { authInputClassName } from './auth-field.ts'
import { FieldError } from './field-error.tsx'

const defaultValues: LoginInput = {
  email: '',
  password: '',
  remember: false,
}

interface LoginFormProps {
  className?: string
}

export function LoginForm({ className }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const signIn = useSignIn()

  const form = useForm({
    defaultValues,
    validators: {
      onBlur: loginSchema,
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      // Failures surface through `signIn.error` below; swallow the rejection
      // so TanStack Form finishes the submit cycle cleanly.
      await signIn.mutateAsync(value).catch(() => undefined)
    },
  })

  return (
    <form
      noValidate
      // If JS is dead (stale tab, failed hydration) a native submit must not
      // leak credentials into the URL the way a default GET submit would.
      method="post"
      className={cn('space-y-5', className)}
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

      <form.Field name="password">
        {(field) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor={field.name}
                className="text-xs font-semibold text-[#0E2748]"
              >
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary no-underline transition-colors hover:text-foreground"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F6FA8]"
                strokeWidth={1.75}
              />
              <Input
                id={field.name}
                name={field.name}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

      {signIn.isError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {getAuthErrorMessage(signIn.error)}
        </p>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="group h-11 w-full font-semibold transition-all"
          >
            {isSubmitting ? (
              'Signing in…'
            ) : (
              <>
                Continue to console
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </>
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
