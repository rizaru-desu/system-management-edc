import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PackagePlus } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'

import { Button } from '#/components/ui/button.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { appReleaseDetailQueryOptions } from '../api/app-release-detail.ts'
import { useCreateAppRelease } from '../api/create-app-release.ts'
import type { AppReleasePayload } from '../api/create-app-release.ts'
import { useDeleteAppRelease } from '../api/delete-app-release.ts'
import { appReleasesListQueryOptions } from '../api/list-app-releases.ts'
import { useSetAppReleasePublished } from '../api/publish-app-release.ts'
import { useUpdateAppRelease } from '../api/update-app-release.ts'
import type {
  AppReleasePlatform,
  AppReleaseRecord,
  AppReleaseUpdateType,
} from '../data/app-releases.ts'
import { AppReleaseFormModal } from './app-release-form-modal.tsx'
import type { AppReleaseFormValues } from './app-release-form-modal.tsx'
import { AppReleaseViewModal } from './app-release-view-modal.tsx'
import { AppReleasesTable } from './app-releases-table.tsx'
import { DeleteAppReleaseDialog } from './delete-app-release-dialog.tsx'
import { PublishAppReleaseDialog } from './publish-app-release-dialog.tsx'

/** Maps the dialog's string fields onto the API payload shape. */
function payloadFromForm(values: AppReleaseFormValues): AppReleasePayload {
  return {
    platform: values.platform,
    updateType: values.updateType,
    versionName: values.versionName,
    versionCode: values.versionCode ? Number(values.versionCode) : 0,
    minimumVersion: values.minimumVersion,
    downloadUrl: values.downloadUrl,
    changelog: values.changelog,
    fileSize: values.fileSize ? Number(values.fileSize) : 0,
    checksum: values.checksum,
    forceUpdate: values.forceUpdate,
    isActive: values.isActive,
    channel: values.channel || 'production',
    runtimeVersion: values.runtimeVersion || '1.0.0',
    publishedAt: values.publishedAt
      ? new Date(values.publishedAt).toISOString()
      : null,
  }
}

/**
 * Administration → App Releases. The APK / OTA release catalogue behind the
 * mobile check-update endpoint: search, platform/type/status filters and
 * pagination all run server-side (GET /app-releases), and every CRUD or
 * publish action goes through the backend API.
 */
export function AppReleasesPage() {
  // ── Search & filters (server-side) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<
    'all' | AppReleasePlatform
  >('all')
  const [typeFilter, setTypeFilter] = useState<'all' | AppReleaseUpdateType>(
    'all',
  )
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')
  // Debounced copy of `search` so the list isn't refetched per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const isFiltering =
    debouncedSearch.trim() !== '' ||
    platformFilter !== 'all' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setPlatformFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
  }

  // ── Pagination (server-side) ───────────────────────────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Changing any filter changes the row set, so any page beyond the first
  // may no longer exist — jump back to page one.
  useEffect(() => {
    setPagination((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    )
  }, [debouncedSearch, platformFilter, typeFilter, statusFilter])

  const listQuery = useQuery(
    appReleasesListQueryOptions({
      search: debouncedSearch,
      platform: platformFilter,
      updateType: typeFilter,
      status: statusFilter,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  )
  const releases = listQuery.data?.releases ?? []
  const total = listQuery.data?.total ?? 0

  // ── Modals ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AppReleaseRecord | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<AppReleaseRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<AppReleaseRecord | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState<AppReleaseRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: AppReleaseRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const openView = (record: AppReleaseRecord) => {
    setViewing(record)
    setViewOpen(true)
  }

  const openDelete = (record: AppReleaseRecord) => {
    setDeleting(record)
    setDeleteOpen(true)
  }

  const openPublishToggle = (record: AppReleaseRecord) => {
    setPublishing(record)
    setPublishOpen(true)
  }

  // The view dialog re-reads the record so it always shows fresh data even
  // when the cached list is stale (GET /app-releases/:id).
  const detailQuery = useQuery({
    ...appReleaseDetailQueryOptions(viewing?.id ?? ''),
    enabled: viewOpen && viewing !== null,
  })

  // ── CRUD (backend API; the mutation hooks own toasts + cache updates) ──
  const createAppRelease = useCreateAppRelease()
  const updateAppRelease = useUpdateAppRelease()
  const deleteAppRelease = useDeleteAppRelease()
  const setAppReleasePublished = useSetAppReleasePublished()

  const saving = createAppRelease.isPending || updateAppRelease.isPending

  // The form stays open (with its submit disabled) until the save lands, so
  // a rejected payload keeps the user's input intact.
  const handleSubmit = (values: AppReleaseFormValues) => {
    const payload = payloadFromForm(values)
    if (editing) {
      updateAppRelease.mutate(
        { id: editing.id, ...payload },
        { onSuccess: () => setFormOpen(false) },
      )
      return
    }
    createAppRelease.mutate(payload, {
      onSuccess: () => setFormOpen(false),
    })
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteAppRelease.mutate({
      id: deleting.id,
      versionName: deleting.versionName,
    })
    setDeleting(null)
  }

  const handlePublishToggle = () => {
    if (!publishing) return
    setAppReleasePublished.mutate({
      id: publishing.id,
      isActive: !publishing.isActive,
    })
    setPublishing(null)
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Administration
          </p>
          <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            App Releases
          </h1>
          <p className="text-sm text-brand-900/60">
            Manage the APK and OTA releases served to mobile devices — versions,
            update policy and changelogs in one place.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
          Add release
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search version or changelog…"
          containerClassName="min-w-[240px] sm:max-w-xs"
        />
        <Select
          value={platformFilter}
          onValueChange={(value) =>
            setPlatformFilter(value as 'all' | AppReleasePlatform)
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="android">Android</SelectItem>
            <SelectItem value="ios">iOS</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(value as 'all' | AppReleaseUpdateType)
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="apk">APK</SelectItem>
            <SelectItem value="ota">OTA</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'all' | 'active' | 'inactive')
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Release table */}
      <AppReleasesTable
        rows={releases}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        isPending={listQuery.isPending}
        isError={listQuery.isError}
        errorMessage={
          listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load app releases.'
        }
        onRetry={() => listQuery.refetch()}
        isFiltering={isFiltering}
        onClearFilters={clearFilters}
        onView={openView}
        onEdit={openEdit}
        onPublishToggle={openPublishToggle}
        onDelete={openDelete}
      />

      <AppReleaseFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        release={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />
      <AppReleaseViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        release={
          detailQuery.data && detailQuery.data.id === viewing?.id
            ? detailQuery.data
            : viewing
        }
      />
      <DeleteAppReleaseDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        release={deleting}
        onConfirm={handleDelete}
      />
      <PublishAppReleaseDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        release={publishing}
        onConfirm={handlePublishToggle}
      />
    </div>
  )
}
