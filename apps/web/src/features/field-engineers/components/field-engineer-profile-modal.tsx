import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, RefreshCw, UserRound } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { UnsavedChangesDialog } from '#/components/UnsavedChangesDialog.tsx'
import { useUnsavedChanges } from '#/hooks/use-unsaved-changes.ts'
import { cn } from '#/lib/utils.ts'
import { ENGINEER_STATUSES, SPECIALIZATIONS } from '../data/field-engineers.ts'
import type {
  AvailableEngineerUser,
  EngineerStatus,
  FieldEngineerRecord,
  SpecializationKey,
} from '../data/field-engineers.ts'

export interface FieldEngineerProfileFormValues {
  userId: string
  warehouseId: string
  coverageRegion: string
  specializations: Array<SpecializationKey>
  status: EngineerStatus
}

/** Warehouse choice offered by the profile form's dropdown. */
export interface WarehouseOption {
  id: string
  name: string
}

interface FieldEngineerProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * When set the modal edits (or completes) this engineer's profile;
   * when null it starts with the "pick a user to onboard" step.
   */
  engineer: FieldEngineerRecord | null
  /** Field Engineer role users without a profile yet — the picker rows. */
  availableUsers: Array<AvailableEngineerUser>
  availableUsersPending: boolean
  availableUsersError: boolean
  onRetryAvailableUsers: () => void
  /** Options of the assigned warehouse/service point dropdown. */
  warehouseOptions: Array<WarehouseOption>
  warehouseOptionsPending: boolean
  /** True while the create/update mutation is in flight. */
  saving: boolean
  onSubmit: (values: FieldEngineerProfileFormValues) => void
}

interface FormErrors {
  user?: string
  warehouse?: string
  coverageRegion?: string
  specializations?: string
}

interface FormState {
  warehouseId: string
  coverageRegion: string
  specializations: Array<SpecializationKey>
  status: EngineerStatus
}

const EMPTY: FormState = {
  warehouseId: '',
  coverageRegion: '',
  specializations: [],
  status: 'active',
}

/**
 * Complete/edit the work profile of a Field Engineer role user. The
 * modal never asks for name/phone/email — identity lives on the User
 * record (Users & Roles) and is only displayed read-only here. Creating
 * starts from a searchable picker of role holders without a profile yet.
 */
export function FieldEngineerProfileModal({
  open,
  onOpenChange,
  engineer,
  availableUsers,
  availableUsersPending,
  availableUsersError,
  onRetryAvailableUsers,
  warehouseOptions,
  warehouseOptionsPending,
  saving,
  onSubmit,
}: FieldEngineerProfileModalProps) {
  // In create mode the user is picked in-modal; in edit mode it's fixed.
  const [pickedUser, setPickedUser] = useState<AvailableEngineerUser | null>(
    null,
  )
  const [userSearch, setUserSearch] = useState('')
  const [values, setValues] = useState<FormState>(EMPTY)
  const [initialValues, setInitialValues] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})

  // Re-seed the fields whenever the modal opens (complete/edit vs create).
  useEffect(() => {
    if (!open) return
    const profile = engineer?.profile ?? null
    const next = profile
      ? {
          warehouseId: profile.warehouseId,
          coverageRegion: profile.coverageRegion,
          specializations: profile.specializations,
          status: profile.status,
        }
      : EMPTY
    setValues(next)
    setInitialValues(next)
    setPickedUser(null)
    setUserSearch('')
    setErrors({})
  }, [open, engineer])

  const selectedUser = engineer
    ? { userId: engineer.userId, name: engineer.name, email: engineer.email }
    : pickedUser

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return availableUsers
    return availableUsers.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(term) ||
        candidate.email.toLowerCase().includes(term),
    )
  }, [availableUsers, userSearch])

  const isDirty =
    (JSON.stringify(values) !== JSON.stringify(initialValues) ||
      pickedUser !== null) &&
    !saving

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

  const patch = (partial: Partial<FormState>) => {
    setValues((previous) => ({ ...previous, ...partial }))
  }

  const toggleSpecialization = (key: SpecializationKey) => {
    setErrors((previous) => ({ ...previous, specializations: undefined }))
    setValues((previous) => ({
      ...previous,
      specializations: previous.specializations.includes(key)
        ? previous.specializations.filter((item) => item !== key)
        : [...previous.specializations, key],
    }))
  }

  const handleSubmit = () => {
    if (saving) return
    const nextErrors: FormErrors = {}
    if (!selectedUser) nextErrors.user = 'Pick a field engineer to onboard.'
    if (!values.warehouseId) {
      nextErrors.warehouse = 'Pick the assigned warehouse or service point.'
    }
    if (!values.coverageRegion.trim()) {
      nextErrors.coverageRegion = 'The coverage region is required.'
    }
    if (values.specializations.length === 0) {
      nextErrors.specializations = 'Pick at least one specialization.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !selectedUser) return

    onSubmit({
      userId: selectedUser.userId,
      warehouseId: values.warehouseId,
      coverageRegion: values.coverageRegion.trim(),
      specializations: values.specializations,
      status: values.status,
    })
  }

  const editing = Boolean(engineer?.profile)

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={handleOpenChange}
        title={
          editing
            ? 'Edit Field Engineer Profile'
            : 'Complete Field Engineer Profile'
        }
        description={
          editing
            ? 'Update the work profile — identity is managed in Users & Roles.'
            : 'Pick a user holding the Field Service Engineer role, then fill in only the work profile. Identity is managed in Users & Roles.'
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
              {editing ? 'Save changes' : 'Complete profile'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Step 1 — the engineer. Read-only identity once picked. */}
          {selectedUser ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-900/70">
                  <UserRound className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-900">
                    {selectedUser.name}
                  </p>
                  <p className="text-xs text-brand-900/50">
                    {selectedUser.email} · identity from Users &amp; Roles
                  </p>
                </div>
              </div>
              {!engineer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickedUser(null)}
                >
                  Change
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Field engineer to onboard</Label>
              <SearchInput
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name or email…"
                containerClassName="w-full"
              />
              <div className="max-h-52 overflow-y-auto rounded-xl border border-brand-100">
                {availableUsersPending && (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                )}
                {!availableUsersPending && availableUsersError && (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <p className="text-sm text-rose-600">
                      Failed to load the available users.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetryAvailableUsers}
                    >
                      <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Try again
                    </Button>
                  </div>
                )}
                {!availableUsersPending &&
                  !availableUsersError &&
                  filteredUsers.length === 0 && (
                    <EmptyState
                      icon={UserRound}
                      title={
                        userSearch.trim()
                          ? 'No matching users'
                          : 'Everyone is onboarded'
                      }
                      description={
                        userSearch.trim()
                          ? 'No Field Engineer role user without a profile matches this search.'
                          : 'Every user holding the Field Service Engineer role already has a profile. Assign the role in Users & Roles first.'
                      }
                    />
                  )}
                {!availableUsersPending &&
                  !availableUsersError &&
                  filteredUsers.map((candidate) => (
                    <button
                      key={candidate.userId}
                      type="button"
                      onClick={() => {
                        setPickedUser(candidate)
                        setErrors((previous) => ({
                          ...previous,
                          user: undefined,
                        }))
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-brand-100 px-4 py-2.5 text-left last:border-0 hover:bg-brand-50/60"
                    >
                      <span>
                        <span className="block text-sm font-medium text-brand-900">
                          {candidate.name}
                        </span>
                        <span className="block text-xs text-brand-900/50">
                          {candidate.email}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
              {errors.user && (
                <p className="text-xs text-rose-600">{errors.user}</p>
              )}
            </div>
          )}

          {/* Step 2 — the work profile. */}
          <div className="space-y-1.5">
            <Label>Assigned warehouse / service point</Label>
            <Select
              value={values.warehouseId || undefined}
              onValueChange={(value) => {
                patch({ warehouseId: value })
                setErrors((previous) => ({ ...previous, warehouse: undefined }))
              }}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(errors.warehouse)}
              >
                <SelectValue
                  placeholder={
                    warehouseOptionsPending
                      ? 'Loading warehouses…'
                      : 'Pick a warehouse'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {warehouseOptions.length === 0 && (
                  <div className="px-3 py-2 text-xs text-brand-900/50">
                    {warehouseOptionsPending
                      ? 'Loading…'
                      : 'No active warehouses available.'}
                  </div>
                )}
                {warehouseOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouse && (
              <p className="text-xs text-rose-600">{errors.warehouse}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="engineer-coverage-region">Coverage region</Label>
            <Input
              id="engineer-coverage-region"
              value={values.coverageRegion}
              onChange={(event) => {
                patch({ coverageRegion: event.target.value })
                setErrors((previous) => ({
                  ...previous,
                  coverageRegion: undefined,
                }))
              }}
              placeholder="e.g. Jakarta Selatan"
              aria-invalid={Boolean(errors.coverageRegion)}
              className={fieldClasses}
            />
            {errors.coverageRegion && (
              <p className="text-xs text-rose-600">{errors.coverageRegion}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Specializations</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((item) => {
                const selected = values.specializations.includes(item.key)
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSpecialization(item.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-brand-900 bg-brand-900 text-white'
                        : 'border-brand-100 bg-white text-brand-900/70 hover:border-brand-900/30',
                    )}
                  >
                    {selected && (
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    {item.label}
                  </button>
                )
              })}
            </div>
            {errors.specializations && (
              <p className="text-xs text-rose-600">{errors.specializations}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={values.status}
              onValueChange={(value) =>
                patch({ status: value as EngineerStatus })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENGINEER_STATUSES.map((status) => (
                  <SelectItem key={status.key} value={status.key}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </BaseModal>

      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
