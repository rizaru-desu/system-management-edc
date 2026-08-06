import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPinned, TriangleAlert, X } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import { cn } from '#/lib/utils.ts'
import type { ServicePointRecord } from '#/features/service-points/index.ts'
import type {
  ServicePointAssignment,
  ServicePointRoleKey,
} from '../data/service-point-assignments.ts'
import type { UserRecord } from '../data/users.ts'
import { RoleBadge } from './role-badge.tsx'
import { ServicePointTransfer } from './service-point-transfer.tsx'

interface AssignServicePointsDrawerProps {
  user: UserRecord | null
  open: boolean
  onClose: () => void
  /** The user's stored ACTIVE assignments (from GET, once loaded). */
  assignments: Array<ServicePointAssignment>
  /** True while the assignments or the catalogue are still loading. */
  assignmentsPending: boolean
  /** Load-failure message; null when both queries are healthy. */
  assignmentsError: string | null
  onRetry: () => void
  /** Service points offered in the transfer's "available" panel. */
  catalogue: Array<ServicePointRecord>
  /**
   * Called with the rows still toggled active when Save is pressed. An empty
   * list is valid — the backend's replace unassigns everything.
   */
  onSave: (user: UserRecord, assignments: Array<ServicePointAssignment>) => void
}

/** Role every newly assigned service point starts with. */
const DEFAULT_ROLE: ServicePointRoleKey = 'engineer'

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '?'
  )
}

/**
 * Exactly one default among 1+ assignments, by construction: the first
 * active assignment becomes default automatically, and removing the default
 * row promotes the first remaining one.
 */
function withDefaultRepaired(
  assignments: Array<ServicePointAssignment>,
): Array<ServicePointAssignment> {
  if (assignments.length === 0) return assignments
  if (assignments.some((assignment) => assignment.isDefault)) return assignments
  return assignments.map((assignment, index) => ({
    ...assignment,
    isDefault: index === 0,
  }))
}

interface AssignmentEditorProps {
  user: UserRecord
  /** Read once, on mount — the editor owns the draft from then on. */
  initialAssignments: Array<ServicePointAssignment>
  catalogue: Array<ServicePointRecord>
  onSave: (user: UserRecord, assignments: Array<ServicePointAssignment>) => void
  onClose: () => void
}

/**
 * The drawer's editable body + footer. Mounted only after the stored
 * assignments have loaded, keyed by user id — the draft comes from a state
 * *initializer*, so there is no effect-based re-seeding that could race the
 * query (empty first paint) or wipe in-progress edits on a background
 * refetch.
 */
function AssignmentEditor({
  user,
  initialAssignments,
  catalogue,
  onSave,
  onClose,
}: AssignmentEditorProps) {
  const [draft, setDraft] = useState<Array<ServicePointAssignment>>(() =>
    withDefaultRepaired(initialAssignments.map((entry) => ({ ...entry }))),
  )
  const [error, setError] = useState<string | null>(null)

  const addServicePoints = (servicePointIds: Array<string>) => {
    setDraft((previous) => {
      const existing = new Set(
        previous.map((assignment) => assignment.servicePointId),
      )
      const today = new Date().toISOString().slice(0, 10)
      const added: Array<ServicePointAssignment> = servicePointIds
        // Duplicate assignments are invalid — the transfer already hides
        // assigned entries, this keeps the invariant under race-y clicks.
        .filter((servicePointId) => !existing.has(servicePointId))
        .map((servicePointId) => ({
          // Draft-only id; the backend mints the real one on save.
          id: `draft-${servicePointId}`,
          userId: user.id,
          servicePointId,
          roleAtServicePoint: DEFAULT_ROLE,
          isDefault: false,
          assignedAt: today,
          status: 'active',
        }))
      return withDefaultRepaired([...previous, ...added])
    })
    setError(null)
  }

  const removeAssignment = (id: string) => {
    setDraft((previous) =>
      withDefaultRepaired(
        previous.filter((assignment) => assignment.id !== id),
      ),
    )
    setError(null)
  }

  const removeAll = () => {
    setDraft([])
    setError(null)
  }

  const setDefault = (id: string) => {
    // Radio semantics: marking one default clears the previous one.
    setDraft((previous) =>
      previous.map((assignment) => ({
        ...assignment,
        isDefault: assignment.id === id,
      })),
    )
    setError(null)
  }

  const setRole = (id: string, role: ServicePointRoleKey) => {
    setDraft((previous) =>
      previous.map((assignment) =>
        assignment.id === id
          ? { ...assignment, roleAtServicePoint: role }
          : assignment,
      ),
    )
  }

  const setStatus = (id: string, active: boolean) => {
    setDraft((previous) =>
      previous.map((assignment) =>
        assignment.id === id
          ? { ...assignment, status: active ? 'active' : 'inactive' }
          : assignment,
      ),
    )
  }

  const handleSave = () => {
    // Rows toggled inactive are unassigned on save (omitted from the PUT
    // payload — the backend soft-unassigns whatever is missing). An empty
    // set is valid and clears every assignment, matching the backend
    // contract; Remove All + Save is the supported way to unassign a user.
    const activeRows = draft.filter(
      (assignment) => assignment.status === 'active',
    )
    if (activeRows.length > 0) {
      const defaults = activeRows.filter((assignment) => assignment.isDefault)
      if (defaults.length !== 1) {
        setError(
          draft.some(
            (assignment) =>
              assignment.isDefault && assignment.status === 'inactive',
          )
            ? 'The default service point must stay active — pick another default first.'
            : 'Mark exactly one service point as the default.',
        )
        return
      }
    }
    onSave(user, activeRows)
    onClose()
  }

  return (
    <>
      {/* Transfer + configuration (scrollable area) */}
      <div className="flex-1 overflow-y-auto bg-brand-50 p-4 md:p-6">
        <ServicePointTransfer
          catalogue={catalogue}
          assignments={draft}
          onAdd={addServicePoints}
          onRemove={removeAssignment}
          onRemoveAll={removeAll}
          onSetDefault={setDefault}
          onRoleChange={setRole}
          onStatusChange={setStatus}
        />
        <p className="mt-4 rounded-lg bg-[#3F6FA8]/5 px-3 py-2 text-xs text-brand-900/60">
          Service point roles are contextual — they do not replace the
          user&apos;s global application role. With a single assignment it is
          the default automatically; with several, exactly one must be marked
          default. Switching a row inactive (or removing all rows) unassigns
          on save.
        </p>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-brand-100 bg-white px-6 py-4">
        <div className="min-w-0 text-xs">
          {error ? (
            <p className="text-rose-600">{error}</p>
          ) : (
            <p className="text-brand-900/50">
              {draft.length}{' '}
              {draft.length === 1 ? 'service point' : 'service points'}{' '}
              assigned
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save assignments
          </Button>
        </div>
      </div>
    </>
  )
}

/**
 * Right-side drawer (same shell as the device drawer) for managing a user's
 * service point assignments — a many-to-many link, edited here as this user's
 * side of the relation. The shell renders the load/error states; the editor
 * mounts only once the stored assignments are in hand.
 */
export function AssignServicePointsDrawer({
  user,
  open,
  onClose,
  assignments,
  assignmentsPending,
  assignmentsError,
  onRetry,
  catalogue,
  onSave,
}: AssignServicePointsDrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background page scrolling while the drawer is open.
  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [open])

  if (!open || !mounted || !user) return null

  return createPortal(
    <>
      {/* Backdrop overlay. z-50 on purpose: all portal layers share z-50 and
        stack by DOM order, so selects opened from inside the drawer — whose
        portals append to <body> later — paint above it. */}
      <div
        className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          // The portal escapes the console's theme-light wrapper — re-scope it
          // here so Button/Select variants keep their light-theme colors.
          'theme-light fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl md:w-[85vw] lg:max-w-[1060px]',
          'border-l border-brand-100',
          'animate-in slide-in-from-right duration-300 ease-out',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Assign service points to ${user.name}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-100 bg-white px-6 py-4 shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3F6FA8]/10 text-[#3F6FA8]">
              <MapPinned className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-brand-900">
                Assign Service Points
              </h2>
              <p className="truncate text-xs text-brand-900/50">
                Manage Service Point assignments for this user.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="shrink-0 rounded-xl text-brand-900/40 hover:bg-brand-100/50 hover:text-brand-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </Button>
        </div>

        {/* User information (read-only) */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-brand-100 bg-white px-6 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 text-sm font-bold text-white">
            {initialsOf(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-brand-900">
                {user.name}
              </p>
              {user.roles.map((role) => (
                <RoleBadge key={role} role={role} short />
              ))}
              <StatusPill active={user.status === 'active'} />
            </div>
            <p className="mt-0.5 truncate text-xs text-brand-900/50">
              {user.email}
            </p>
          </div>
        </div>

        {assignmentsError !== null ? (
          <div className="flex-1 overflow-y-auto bg-brand-50 p-4 md:p-6">
            <EmptyState
              icon={TriangleAlert}
              tone="danger"
              title={assignmentsError}
              action={
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : assignmentsPending ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-brand-50">
            <Loader2
              className="h-6 w-6 animate-spin text-brand-500"
              strokeWidth={1.75}
            />
            <p className="text-sm text-brand-900/40">Loading assignments...</p>
          </div>
        ) : (
          // Keyed by user so switching targets always starts a fresh draft.
          <AssignmentEditor
            key={user.id}
            user={user}
            initialAssignments={assignments}
            catalogue={catalogue}
            onSave={onSave}
            onClose={onClose}
          />
        )}
      </div>
    </>,
    document.body,
  )
}
