import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, ShieldAlert } from 'lucide-react'

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
import { Switch } from '#/components/ui/switch.tsx'
import { ROLES } from '#/features/console/index.ts'
import type { RoleKey } from '#/features/console/index.ts'
import { cn } from '#/lib/utils.ts'
import type { UserRecord } from '../data/users.ts'

const SYSTEM_ADMIN: RoleKey = 'System_Administrator'

export interface UserFormValues {
  name: string
  email: string
  /**
   * Role keys as stored in the DB. May include keys outside the console
   * catalogue (no checkbox in the grid) — those are preserved on save so an
   * edit never silently strips roles the form doesn't know.
   */
  roles: Array<string>
  status: UserRecord['status']
  /** Free-text note kept while inactive; ignored when the account is active. */
  banReason: string
  /**
   * Initial credential password — create mode only; always empty on edits
   * (the form has no field for it there and nothing reads it).
   */
  password: string
}

interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this user; otherwise it creates a new one. */
  user: UserRecord | null
  onSubmit: (values: UserFormValues) => void
}

interface FormErrors {
  name?: string
  email?: string
  roles?: string
  password?: string
}

/** Matches the backend DTO (Better Auth's default password bounds). */
const MIN_PASSWORD_LENGTH = 8

const PASSWORD_SYMBOLS = '!@#$%&*'
/** Digits/capitals minus lookalikes (0/O, 1/I) — the password is read aloud/shared. */
const PASSWORD_DIGITS = '23456789'
const PASSWORD_CAPITALS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

function pickRandom(pool: string, count: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(count))
  return Array.from(bytes, (byte) => pool[byte % pool.length]).join('')
}

function randomInt(maxExclusive: number): number {
  const [value] = crypto.getRandomValues(new Uint32Array(1))
  return value % maxExclusive
}

/** Auto-generated initial password: random dd-MMMM-YYYY + symbol + digits + capitals. */
function generatePassword(): string {
  const year = 1950 + randomInt(100)
  const month = randomInt(12)
  const day = 1 + randomInt(new Date(year, month + 1, 0).getDate())
  const monthName = new Date(year, month, day).toLocaleString('en-US', {
    month: 'long',
  })
  return `${String(day).padStart(2, '0')}-${monthName}-${year}${pickRandom(PASSWORD_SYMBOLS, 1)}${pickRandom(PASSWORD_DIGITS, 2)}${pickRandom(PASSWORD_CAPITALS, 2)}`
}

const EMPTY: UserFormValues = {
  name: '',
  email: '',
  roles: [],
  status: 'active',
  banReason: '',
  password: '',
}

export function UserFormModal({
  open,
  onOpenChange,
  user,
  onSubmit,
}: UserFormModalProps) {
  const [values, setValues] = useState<UserFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      setValues(
        user
          ? {
              name: user.name,
              email: user.email,
              roles: [...user.roles],
              status: user.status,
              banReason: user.banReason ?? '',
              password: '',
            }
          : { ...EMPTY, password: generatePassword() },
      )
      setErrors({})
      setShowPassword(false)
    }
  }, [open, user])

  const isSysAdmin = values.roles.includes(SYSTEM_ADMIN)

  const toggleRole = (key: RoleKey) => {
    setValues((previous) => {
      // System Administrator is exclusive: picking it replaces the whole
      // selection, and while active every other role is locked out.
      if (key === SYSTEM_ADMIN) {
        const active = previous.roles.includes(SYSTEM_ADMIN)
        return { ...previous, roles: active ? [] : [SYSTEM_ADMIN] }
      }
      if (previous.roles.includes(SYSTEM_ADMIN)) return previous
      const active = previous.roles.includes(key)
      return {
        ...previous,
        roles: active
          ? previous.roles.filter((role) => role !== key)
          : [...previous.roles, key],
      }
    })
    setErrors((previous) => ({ ...previous, roles: undefined }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Full name is required.'
    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (user) {
      // Editing: deactivated accounts may have every role stripped.
      if (values.status === 'active' && values.roles.length === 0) {
        nextErrors.roles = 'Assign at least one role for an active account.'
      }
    } else {
      // Creating: a brand-new account always needs a role (the backend
      // enforces the same), plus the initial password.
      if (values.roles.length === 0) {
        nextErrors.roles = 'Assign at least one role.'
      }
      if (values.password.length < MIN_PASSWORD_LENGTH) {
        nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      }
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      banReason: values.status === 'inactive' ? values.banReason.trim() : '',
      password: user ? '' : values.password,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
            {user ? 'Edit user' : 'Add user'}
          </DialogTitle>
          <DialogDescription className="text-[#0E2748]/60">
            {user
              ? 'Update the account details and role assignment.'
              : 'Create a console account and assign one or more roles.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-[#0E2748]">
                Full name
              </Label>
              <Input
                id="user-name"
                value={values.name}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Rina Kartika"
                aria-invalid={Boolean(errors.name)}
                className="border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white"
              />
              {errors.name && (
                <p className="text-xs text-rose-600">{errors.name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-[#0E2748]">
                Email
              </Label>
              <Input
                id="user-email"
                type="email"
                value={values.email}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="name@edc.co.id"
                aria-invalid={Boolean(errors.email)}
                className="border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white"
              />
              {errors.email && (
                <p className="text-xs text-rose-600">{errors.email}</p>
              )}
            </div>
          </div>

          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="user-password" className="text-[#0E2748]">
                Initial password
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.password}
                  disabled
                  aria-invalid={Boolean(errors.password)}
                  className="border-brand-100 bg-white pr-10 text-brand-900 disabled:opacity-100 dark:border-brand-100 dark:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-brand-900/50 transition-colors hover:text-brand-900"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-rose-600">{errors.password}</p>
              ) : (
                <p className="text-xs text-[#0E2748]/50">
                  Auto-generated — share it with the user for their first
                  sign-in.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label className="text-[#0E2748]">Roles</Label>
              <span className="text-[11px] text-[#0E2748]/50">
                {isSysAdmin
                  ? 'Exclusive role'
                  : `${values.roles.length} selected`}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((role) => {
                const selected = values.roles.includes(role.key)
                const locked = isSysAdmin && role.key !== SYSTEM_ADMIN
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => toggleRole(role.key)}
                    disabled={locked}
                    aria-pressed={selected}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'border-[#3F6FA8] bg-[#3F6FA8]/10'
                        : 'border-[#DDE0EC] bg-white hover:border-[#3F6FA8]/60',
                      locked && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        selected
                          ? 'border-[#3F6FA8] bg-[#3F6FA8] text-white'
                          : 'border-[#DDE0EC] bg-white',
                      )}
                    >
                      {selected && (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      )}
                    </span>
                    <span className="flex-1 leading-tight">
                      <span className="block font-medium text-[#0E2748]">
                        {role.label}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        role.color.split(' ')[0],
                      )}
                    />
                  </button>
                )
              })}
            </div>

            {isSysAdmin && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ShieldAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  strokeWidth={2}
                />
                System Administrator already grants full access, so it cannot be
                combined with other roles. Unselect it to mix roles.
              </p>
            )}
            {errors.roles && (
              <p className="text-xs text-rose-600">{errors.roles}</p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-[#DDE0EC] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0E2748]">
                  Active account
                </p>
                <p className="text-xs text-[#0E2748]/50">
                  Inactive users cannot sign in to the console.
                </p>
              </div>
              <Switch
                className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
                checked={values.status === 'active'}
                onCheckedChange={(checked) =>
                  setValues((previous) => ({
                    ...previous,
                    status: checked ? 'active' : 'inactive',
                  }))
                }
              />
            </div>
            {values.status === 'inactive' && (
              <div className="space-y-1.5">
                <Label htmlFor="ban-reason" className="text-[#0E2748]">
                  Deactivation reason{' '}
                  <span className="font-normal text-[#0E2748]/40">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="ban-reason"
                  value={values.banReason}
                  maxLength={500}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      banReason: event.target.value,
                    }))
                  }
                  placeholder="e.g. Resigned — access revoked"
                  className="border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white"
                />
                <p className="text-xs text-[#0E2748]/50">
                  Shown when hovering the Inactive status in the users table.
                </p>
              </div>
            )}
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
              {user ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
