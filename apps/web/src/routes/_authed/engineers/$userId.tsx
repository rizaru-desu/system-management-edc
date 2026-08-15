import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import {
  FieldEngineerDetailPage,
  FieldEngineerProfileModal,
} from '#/features/field-engineers/index.ts'
import type { FieldEngineerRecord } from '#/features/field-engineers/index.ts'

/** Detail view of one field engineer (Service Operations → Field Engineers). */
export const Route = createFileRoute('/_authed/engineers/$userId')({
  head: () => ({
    meta: [{ title: 'Field Engineer — EDC Management' }],
  }),
  component: FieldEngineerDetailRoute,
})

function FieldEngineerDetailRoute() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FieldEngineerRecord | null>(null)

  const openEdit = (record: FieldEngineerRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  // Wired to GET /field-engineers/:userId in the API integration phase.
  return (
    <>
      <FieldEngineerDetailPage
        engineer={null}
        isPending={false}
        isError={false}
        errorMessage="Failed to load the field engineer."
        onRetry={() => {}}
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
        warehouseOptions={[]}
        warehouseOptionsPending={false}
        saving={false}
        onSubmit={() => setFormOpen(false)}
      />
    </>
  )
}
