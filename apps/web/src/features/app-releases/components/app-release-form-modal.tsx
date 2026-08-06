import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, TriangleAlert } from 'lucide-react'

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
import { Textarea } from '#/components/ui/textarea.tsx'
import { UnsavedChangesDialog } from '#/components/UnsavedChangesDialog.tsx'
import { useUnsavedChanges } from '#/hooks/use-unsaved-changes.ts'
import { releaseVersionAvailabilityQueryOptions } from '../api/check-app-release-version.ts'
import type {
  AppReleasePlatform,
  AppReleaseRecord,
  AppReleaseUpdateType,
} from '../data/app-releases.ts'

export interface AppReleaseFormValues {
  platform: AppReleasePlatform
  updateType: AppReleaseUpdateType
  versionName: string
  versionCode: string
  minimumVersion: string
  downloadUrl: string
  changelog: string
  fileSize: string
  checksum: string
  forceUpdate: boolean
  isActive: boolean
  channel: string
  runtimeVersion: string
  /** datetime-local value (yyyy-MM-ddTHH:mm); empty = not scheduled yet. */
  publishedAt: string
}

interface AppReleaseFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the modal edits this record; otherwise it creates a new one. */
  release: AppReleaseRecord | null
  /** True while the create/update mutation is in flight. */
  saving: boolean
  /**
   * Incremented by the page whenever the API rejects a save with the
   * duplicate-version 409 — each bump surfaces the inline field errors while
   * the entered values stay intact.
   */
  duplicateConflict: number
  onSubmit: (values: AppReleaseFormValues) => void
}

interface FormErrors {
  versionName?: string
  versionCode?: string
  minimumVersion?: string
  downloadUrl?: string
  fileSize?: string
  publishedAt?: string
}

const EMPTY: AppReleaseFormValues = {
  platform: 'android',
  updateType: 'apk',
  versionName: '',
  versionCode: '',
  minimumVersion: '',
  downloadUrl: '',
  changelog: '',
  fileSize: '',
  checksum: '',
  forceUpdate: false,
  isActive: false,
  channel: 'production',
  runtimeVersion: '1.0.0',
  publishedAt: '',
}

/** Dotted numeric version, e.g. "1.0.0" — mirrors the backend DTO. */
const VERSION_PATTERN = /^\d+(\.\d+){1,3}$/

/** Parses an optional non-negative integer; empty is fine. */
function integerError(raw: string, label: string): string | undefined {
  if (!raw.trim()) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    return `${label} must be a non-negative whole number.`
  }
  return undefined
}

/** ISO timestamp → the local `datetime-local` input value. */
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function valuesFromRecord(release: AppReleaseRecord): AppReleaseFormValues {
  return {
    platform: release.platform,
    updateType: release.updateType,
    versionName: release.versionName,
    versionCode: String(release.versionCode),
    minimumVersion: release.minimumVersion,
    downloadUrl: release.downloadUrl,
    changelog: release.changelog,
    fileSize: release.fileSize > 0 ? String(release.fileSize) : '',
    checksum: release.checksum,
    forceUpdate: release.forceUpdate,
    isActive: release.isActive,
    channel: release.channel,
    runtimeVersion: release.runtimeVersion,
    publishedAt: toDateTimeLocal(release.publishedAt),
  }
}

const DUPLICATE_VERSION_MESSAGE = 'This version already exists.'

export function AppReleaseFormModal({
  open,
  onOpenChange,
  release,
  saving,
  duplicateConflict,
  onSubmit,
}: AppReleaseFormModalProps) {
  const [values, setValues] = useState<AppReleaseFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [initialValues, setInitialValues] =
    useState<AppReleaseFormValues>(EMPTY)

  // Re-seed the form whenever the modal opens for a different target.
  useEffect(() => {
    if (open) {
      const seeded = release ? valuesFromRecord(release) : EMPTY
      setValues(seeded)
      setInitialValues(seeded)
      setErrors({})
    }
  }, [open, release])

  // A duplicate-version 409 from the API highlights the version fields
  // in place — the entered values are never reset.
  useEffect(() => {
    if (duplicateConflict > 0) {
      setErrors((previous) => ({
        ...previous,
        versionName: DUPLICATE_VERSION_MESSAGE,
        versionCode: DUPLICATE_VERSION_MESSAGE,
      }))
    }
  }, [duplicateConflict])

  // ── Live availability check (advisory) ─────────────────────────────────
  // Once the identity fields settle, probe the backend for an existing
  // release with the same combination; a hit shows a warning and blocks
  // submission (editing stays free, and the server still enforces it).
  const identity = useMemo(
    () => ({
      platform: values.platform,
      updateType: values.updateType,
      versionName: values.versionName.trim(),
      versionCode: values.versionCode.trim() ? Number(values.versionCode) : 0,
      excludeId: release?.id,
    }),
    [
      values.platform,
      values.updateType,
      values.versionName,
      values.versionCode,
      release,
    ],
  )
  const [debouncedIdentity, setDebouncedIdentity] = useState(identity)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedIdentity(identity), 400)
    return () => clearTimeout(timer)
  }, [identity])

  const identitySettled =
    debouncedIdentity.versionName === identity.versionName &&
    debouncedIdentity.versionCode === identity.versionCode &&
    debouncedIdentity.platform === identity.platform &&
    debouncedIdentity.updateType === identity.updateType

  const availabilityQuery = useQuery({
    ...releaseVersionAvailabilityQueryOptions(debouncedIdentity),
    enabled:
      open &&
      VERSION_PATTERN.test(debouncedIdentity.versionName) &&
      Number.isInteger(debouncedIdentity.versionCode) &&
      debouncedIdentity.versionCode >= 0,
  })
  const knownDuplicate =
    identitySettled && availabilityQuery.data?.available === false

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const { guard, dialogProps } = useUnsavedChanges({
    when: open && isDirty && !saving,
  })

  /** Routes dirty close attempts through the custom confirmation dialog. */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      guard(() => onOpenChange(false))
      return
    }
    onOpenChange(true)
  }

  const setField = <TField extends keyof AppReleaseFormValues>(
    field: TField,
    value: AppReleaseFormValues[TField],
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
    if (!values.versionName.trim()) {
      nextErrors.versionName = 'Version name is required.'
    } else if (!VERSION_PATTERN.test(values.versionName.trim())) {
      nextErrors.versionName = 'Use a dotted numeric version, e.g. 1.4.0.'
    }
    const versionCodeError = integerError(values.versionCode, 'Version code')
    if (versionCodeError) nextErrors.versionCode = versionCodeError
    if (!values.minimumVersion.trim()) {
      nextErrors.minimumVersion = 'Minimum version is required.'
    } else if (!VERSION_PATTERN.test(values.minimumVersion.trim())) {
      nextErrors.minimumVersion = 'Use a dotted numeric version, e.g. 1.0.0.'
    }
    const url = values.downloadUrl.trim()
    if (!url && values.updateType === 'apk') {
      nextErrors.downloadUrl = 'A download URL is required for APK releases.'
    } else if (url && !/^https?:\/\/\S+$/.test(url)) {
      nextErrors.downloadUrl = 'Enter a valid http(s) URL.'
    }
    const fileSizeError = integerError(values.fileSize, 'File size')
    if (fileSizeError) nextErrors.fileSize = fileSizeError
    if (
      values.publishedAt &&
      Number.isNaN(new Date(values.publishedAt).getTime())
    ) {
      nextErrors.publishedAt = 'Enter a valid publish date.'
    }
    // The live availability check already flagged this combination — block
    // the submit (the server would reject it with a 409 anyway).
    if (knownDuplicate) {
      nextErrors.versionName = DUPLICATE_VERSION_MESSAGE
      nextErrors.versionCode = DUPLICATE_VERSION_MESSAGE
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      ...values,
      versionName: values.versionName.trim(),
      versionCode: values.versionCode.trim(),
      minimumVersion: values.minimumVersion.trim(),
      downloadUrl: url,
      changelog: values.changelog.trim(),
      fileSize: values.fileSize.trim(),
      checksum: values.checksum.trim(),
      channel: values.channel.trim(),
      runtimeVersion: values.runtimeVersion.trim(),
    })
  }

  const fieldClasses =
    'border-[#DDE0EC] bg-white text-[#0E2748] placeholder:text-[#0E2748]/40 dark:border-[#DDE0EC] dark:bg-white'

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="theme-light max-h-[90vh] overflow-y-auto border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              {release ? 'Edit release' : 'Add release'}
            </DialogTitle>
            <DialogDescription className="text-[#0E2748]/60">
              {release
                ? 'Update the release metadata served to mobile clients.'
                : 'Register an APK or OTA release for the mobile app.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ar-platform" className="text-[#0E2748]">
                  Platform
                </Label>
                <Select
                  value={values.platform}
                  onValueChange={(value) =>
                    setField('platform', value as AppReleasePlatform)
                  }
                >
                  <SelectTrigger
                    id="ar-platform"
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-update-type" className="text-[#0E2748]">
                  Update type
                </Label>
                <Select
                  value={values.updateType}
                  onValueChange={(value) =>
                    setField('updateType', value as AppReleaseUpdateType)
                  }
                >
                  <SelectTrigger
                    id="ar-update-type"
                    className={`w-full ${fieldClasses}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apk">APK — full installer</SelectItem>
                    <SelectItem value="ota">
                      OTA — over-the-air bundle
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ar-version-name" className="text-[#0E2748]">
                  Version name{' '}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="ar-version-name"
                  value={values.versionName}
                  onChange={(event) =>
                    setField('versionName', event.target.value)
                  }
                  placeholder="e.g. 1.4.0"
                  aria-invalid={Boolean(errors.versionName)}
                  className={fieldClasses}
                />
                {errors.versionName && (
                  <p className="text-xs text-rose-600">{errors.versionName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-version-code" className="text-[#0E2748]">
                  Version code
                </Label>
                <Input
                  id="ar-version-code"
                  inputMode="numeric"
                  value={values.versionCode}
                  onChange={(event) =>
                    setField('versionCode', event.target.value)
                  }
                  placeholder="e.g. 140"
                  aria-invalid={Boolean(errors.versionCode)}
                  className={fieldClasses}
                />
                {errors.versionCode && (
                  <p className="text-xs text-rose-600">{errors.versionCode}</p>
                )}
              </div>
              {knownDuplicate && (
                <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 sm:col-span-2">
                  <TriangleAlert
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={1.75}
                  />
                  This version already exists for{' '}
                  {values.platform === 'ios' ? 'iOS' : 'Android'}{' '}
                  {values.updateType.toUpperCase()} — change the version name or
                  code before saving.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ar-minimum-version" className="text-[#0E2748]">
                  Minimum version{' '}
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="ar-minimum-version"
                  value={values.minimumVersion}
                  onChange={(event) =>
                    setField('minimumVersion', event.target.value)
                  }
                  placeholder="e.g. 1.0.0"
                  aria-invalid={Boolean(errors.minimumVersion)}
                  className={fieldClasses}
                />
                {errors.minimumVersion ? (
                  <p className="text-xs text-rose-600">
                    {errors.minimumVersion}
                  </p>
                ) : (
                  <p className="text-xs text-[#0E2748]/50">
                    Clients below this version are forced to update.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-published-at" className="text-[#0E2748]">
                  Publish date
                </Label>
                <Input
                  id="ar-published-at"
                  type="datetime-local"
                  value={values.publishedAt}
                  onChange={(event) =>
                    setField('publishedAt', event.target.value)
                  }
                  aria-invalid={Boolean(errors.publishedAt)}
                  className={fieldClasses}
                />
                {errors.publishedAt ? (
                  <p className="text-xs text-rose-600">{errors.publishedAt}</p>
                ) : (
                  <p className="text-xs text-[#0E2748]/50">
                    Leave empty to stamp it when the release is published.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ar-download-url" className="text-[#0E2748]">
                Download URL{' '}
                {values.updateType === 'apk' && (
                  <span className="text-rose-600" aria-hidden="true">
                    *
                  </span>
                )}
              </Label>
              <Input
                id="ar-download-url"
                type="url"
                value={values.downloadUrl}
                onChange={(event) =>
                  setField('downloadUrl', event.target.value)
                }
                placeholder="e.g. https://cdn.edc.co.id/releases/app-1.4.0.apk"
                aria-invalid={Boolean(errors.downloadUrl)}
                className={fieldClasses}
              />
              {errors.downloadUrl && (
                <p className="text-xs text-rose-600">{errors.downloadUrl}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ar-file-size" className="text-[#0E2748]">
                  File size (bytes)
                </Label>
                <Input
                  id="ar-file-size"
                  inputMode="numeric"
                  value={values.fileSize}
                  onChange={(event) => setField('fileSize', event.target.value)}
                  placeholder="e.g. 52428800"
                  aria-invalid={Boolean(errors.fileSize)}
                  className={fieldClasses}
                />
                {errors.fileSize && (
                  <p className="text-xs text-rose-600">{errors.fileSize}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ar-checksum" className="text-[#0E2748]">
                  Checksum
                </Label>
                <Input
                  id="ar-checksum"
                  value={values.checksum}
                  onChange={(event) => setField('checksum', event.target.value)}
                  placeholder="e.g. sha256:9f86d08…"
                  className={fieldClasses}
                />
              </div>
            </div>

            {values.updateType === 'ota' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ar-channel" className="text-[#0E2748]">
                    OTA channel
                  </Label>
                  <Input
                    id="ar-channel"
                    value={values.channel}
                    onChange={(event) =>
                      setField('channel', event.target.value)
                    }
                    placeholder="e.g. production"
                    className={fieldClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="ar-runtime-version"
                    className="text-[#0E2748]"
                  >
                    Runtime version
                  </Label>
                  <Input
                    id="ar-runtime-version"
                    value={values.runtimeVersion}
                    onChange={(event) =>
                      setField('runtimeVersion', event.target.value)
                    }
                    placeholder="e.g. 1.0.0"
                    className={fieldClasses}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ar-changelog" className="text-[#0E2748]">
                Changelog{' '}
                <span className="font-normal text-[#0E2748]/40">
                  (Markdown supported)
                </span>
              </Label>
              <Textarea
                id="ar-changelog"
                value={values.changelog}
                onChange={(event) => setField('changelog', event.target.value)}
                rows={5}
                maxLength={10_000}
                placeholder={
                  'e.g.\n- Faster merchant sync\n- Fixed login crash on Android 14'
                }
                className={fieldClasses}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-[#0E2748]">
                  Force update
                </p>
                <p className="text-xs text-[#0E2748]/50">
                  Clients must install this release before continuing to use the
                  app.
                </p>
              </div>
              <Switch
                className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
                checked={values.forceUpdate}
                onCheckedChange={(checked) => setField('forceUpdate', checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#DDE0EC] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-[#0E2748]">
                  Active release
                </p>
                <p className="text-xs text-[#0E2748]/50">
                  The active release is the one served to devices — activating
                  this one deactivates the platform&apos;s current release.
                </p>
              </div>
              <Switch
                className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
                checked={values.isActive}
                onCheckedChange={(checked) => setField('isActive', checked)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || knownDuplicate}>
                {saving && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={1.75}
                  />
                )}
                {release ? 'Save changes' : 'Create release'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
