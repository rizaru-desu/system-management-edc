import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  FieldEngineerDetailPage,
  FieldEngineerProfileModal,
  engineerWarehouseOptionsQueryOptions,
  fieldEngineerDetailQueryOptions,
  useCreateEngineerProfile,
  useUpdateEngineerProfile,
} from '#/features/field-engineers/index.ts'
import type {
  FieldEngineerProfileFormValues,
  FieldEngineerRecord,
} from '#/features/field-engineers/index.ts'

/** Detail view of one field engineer (Service Operations → Field Engineers). */
export const Route = createFileRoute('/_authed/engineers/$userId')({
  head: () => ({
    meta: [{ title: 'Field Engineer — EDC Management' }],
  }),
  component: FieldEngineerDetailRoute,
})

function FieldEngineerDetailRoute() {
  const { userId } = Route.useParams()
  const detailQuery = useQuery(fieldEngineerDetailQueryOptions(userId))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FieldEngineerRecord | null>(null)

  const warehousesQuery = useQuery({
    ...engineerWarehouseOptionsQueryOptions(),
    enabled: formOpen,
  })

  const createProfile = useCreateEngineerProfile()
  const updateProfile = useUpdateEngineerProfile()
  const saving = createProfile.isPending || updateProfile.isPending

  const openEdit = (record: FieldEngineerRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const handleSubmit = (values: FieldEngineerProfileFormValues) => {
    const callbacks = { onSuccess: () => setFormOpen(false) }
    if (editing?.profile) {
      updateProfile.mutate(values, callbacks)
      return
    }
    createProfile.mutate(values, callbacks)
  }

  return (
    <>
      <FieldEngineerDetailPage
        engineer={detailQuery.data ?? null}
        isPending={detailQuery.isPending}
        isError={detailQuery.isError}
        errorMessage={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Failed to load the field engineer.'
        }
        onRetry={() => detailQuery.refetch()}
        onEditProfile={openEdit}
      />
      <FieldEngineerProfileModal
        open={formOpen}
        onOpenChange={setFormOpen}
        engineer={editing}
        availableUsers={[]}
        availableUsersPending={false}
        availableUsersError={false}
        onRetryAvailableUsers={() => {}}
        warehouseOptions={warehousesQuery.data ?? []}
        warehouseOptionsPending={warehousesQuery.isPending}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </>
  )
}
