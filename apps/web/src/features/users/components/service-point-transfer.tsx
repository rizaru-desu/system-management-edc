import { useMemo, useState } from 'react'
import { Check, ChevronsRight, ListX, MapPin, MapPinned, X } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { cn } from '#/lib/utils.ts'
import type { ServicePointRecord } from '#/features/service-points/index.ts'
import { SERVICE_POINT_ROLES } from '../data/service-point-assignments.ts'
import type {
  ServicePointAssignment,
  ServicePointRoleKey,
} from '../data/service-point-assignments.ts'

interface ServicePointTransferProps {
  /** Full service point catalogue; assigned entries are filtered out. */
  catalogue: Array<ServicePointRecord>
  assignments: Array<ServicePointAssignment>
  onAdd: (servicePointIds: Array<string>) => void
  onRemove: (assignmentId: string) => void
  onRemoveAll: () => void
  /** Marks this assignment default and clears the flag everywhere else. */
  onSetDefault: (assignmentId: string) => void
  onRoleChange: (assignmentId: string, role: ServicePointRoleKey) => void
  onStatusChange: (assignmentId: string, active: boolean) => void
}

/**
 * Transfer control for user ⇄ service point assignment: available catalogue
 * on the left (search + multi-select + select all), assigned entries on the
 * right as the configuration table (Default / Service Point / Role / Status).
 * Adding moves an entry out of the left list, so duplicates are impossible
 * by construction.
 */
export function ServicePointTransfer({
  catalogue,
  assignments,
  onAdd,
  onRemove,
  onRemoveAll,
  onSetDefault,
  onRoleChange,
  onStatusChange,
}: ServicePointTransferProps) {
  const [search, setSearch] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const assignedIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.servicePointId)),
    [assignments],
  )

  const servicePointsById = useMemo(
    () => new Map(catalogue.map((servicePoint) => [servicePoint.id, servicePoint])),
    [catalogue],
  )

  const available = useMemo(() => {
    const term = search.trim().toLowerCase()
    return catalogue.filter(
      (servicePoint) =>
        !assignedIds.has(servicePoint.id) &&
        (term === '' ||
          servicePoint.name.toLowerCase().includes(term) ||
          servicePoint.code.toLowerCase().includes(term) ||
          (servicePoint.region ?? '').toLowerCase().includes(term)),
    )
  }, [catalogue, assignedIds, search])

  const checkedAvailable = available.filter((servicePoint) =>
    checkedIds.has(servicePoint.id),
  )
  const allChecked =
    available.length > 0 && checkedAvailable.length === available.length

  const toggleChecked = (id: string) => {
    setCheckedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    setCheckedIds(
      allChecked
        ? new Set()
        : new Set(available.map((servicePoint) => servicePoint.id)),
    )
  }

  const addChecked = () => {
    if (checkedAvailable.length === 0) return
    onAdd(checkedAvailable.map((servicePoint) => servicePoint.id))
    setCheckedIds(new Set())
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* ── Left panel: available ── */}
      <Card className="flex min-h-[320px] flex-col overflow-hidden">
        <div className="space-y-3 border-b border-brand-100 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#47618B]">
              Available Service Points
            </h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-100/80 px-1.5 text-xs font-bold text-brand-900">
              {available.length}
            </span>
          </div>
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, code or region…"
            containerClassName="min-w-0 flex-1"
          />
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={toggleAll}
              disabled={available.length === 0}
              className="font-semibold text-brand-500 transition-colors hover:text-brand-900 disabled:pointer-events-none disabled:opacity-40"
            >
              {allChecked ? 'Clear selection' : 'Select all'}
            </button>
            <span className="text-brand-900/50">
              {checkedAvailable.length} selected
            </span>
          </div>
        </div>

        <div className="max-h-[320px] flex-1 space-y-1.5 overflow-y-auto p-3">
          {available.length === 0 ? (
            <EmptyState
              icon={MapPin}
              className="py-10"
              description={
                search.trim()
                  ? 'No available service points match the search.'
                  : 'Every service point is already assigned.'
              }
            />
          ) : (
            available.map((servicePoint) => {
              const checked = checkedIds.has(servicePoint.id)
              return (
                <button
                  key={servicePoint.id}
                  type="button"
                  onClick={() => toggleChecked(servicePoint.id)}
                  aria-pressed={checked}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    checked
                      ? 'border-[#3F6FA8] bg-[#3F6FA8]/10'
                      : 'border-[#DDE0EC] bg-white hover:border-[#3F6FA8]/60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      checked
                        ? 'border-[#3F6FA8] bg-[#3F6FA8] text-white'
                        : 'border-[#DDE0EC] bg-white',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-medium text-[#0E2748]">
                      {servicePoint.name}
                    </span>
                    <span className="block truncate text-[11px] text-[#0E2748]/50">
                      {servicePoint.code}
                      {servicePoint.region ? ` · ${servicePoint.region}` : ''}
                    </span>
                  </span>
                  {servicePoint.status === 'inactive' && (
                    <Badge variant="muted" size="sm">
                      Inactive
                    </Badge>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="border-t border-brand-100 p-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={checkedAvailable.length === 0}
            onClick={addChecked}
          >
            <ChevronsRight className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Assign selected
            {checkedAvailable.length > 0 && ` (${checkedAvailable.length})`}
          </Button>
        </div>
      </Card>

      {/* ── Right panel: assigned + per-assignment configuration ── */}
      <Card className="flex min-h-[320px] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-brand-100 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#47618B]">
              Assigned Service Points
            </h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-100/80 px-1.5 text-xs font-bold text-brand-900">
              {assignments.length}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={assignments.length === 0}
            onClick={onRemoveAll}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <ListX className="h-3.5 w-3.5" strokeWidth={1.75} />
            Remove all
          </Button>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            iconChip
            className="flex-1 py-10"
            title="No service points assigned"
            description="Pick service points on the left and assign them to this user."
          />
        ) : (
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                  <th className="w-16 px-4 py-2.5 text-center font-semibold">
                    Default
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Service Point</th>
                  <th className="w-[150px] px-3 py-2.5 font-semibold">
                    Role at Service Point
                  </th>
                  <th className="w-20 px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-12 px-3 py-2.5" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const servicePoint = servicePointsById.get(
                    assignment.servicePointId,
                  )
                  return (
                    <tr
                      key={assignment.id}
                      className="border-b border-brand-100 last:border-0 hover:bg-brand-50/60"
                    >
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={assignment.isDefault}
                          aria-label={`Make ${servicePoint?.name ?? 'this service point'} the default`}
                          onClick={() => onSetDefault(assignment.id)}
                          className={cn(
                            'inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                            assignment.isDefault
                              ? 'border-[#3F6FA8] bg-white'
                              : 'border-[#DDE0EC] bg-white hover:border-[#3F6FA8]/60',
                          )}
                        >
                          {assignment.isDefault && (
                            <span className="h-2 w-2 rounded-full bg-[#3F6FA8]" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="min-w-0 leading-tight">
                          <p className="flex items-center gap-1.5 truncate font-medium text-brand-900">
                            {servicePoint?.name ?? assignment.servicePointId}
                            {assignment.isDefault && (
                              <Badge variant="primary" size="sm">
                                Default
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-brand-900/45">
                            {servicePoint?.code ?? '—'} · since{' '}
                            {assignment.assignedAt}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Select
                          value={assignment.roleAtServicePoint}
                          onValueChange={(value) =>
                            onRoleChange(
                              assignment.id,
                              value as ServicePointRoleKey,
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label="Role at service point"
                            className="h-8 w-[130px] text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_POINT_ROLES.map((role) => (
                              <SelectItem key={role.key} value={role.key}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2.5">
                        <Switch
                          aria-label={
                            assignment.status === 'active'
                              ? 'Assignment active'
                              : 'Assignment inactive'
                          }
                          className="data-[state=checked]:bg-[#3F6FA8] data-[state=unchecked]:bg-[#DDE0EC] dark:data-[state=unchecked]:bg-[#DDE0EC] [&_[data-slot=switch-thumb]]:!bg-white"
                          checked={assignment.status === 'active'}
                          onCheckedChange={(checked) =>
                            onStatusChange(assignment.id, checked)
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${servicePoint?.name ?? 'assignment'}`}
                          onClick={() => onRemove(assignment.id)}
                          className="text-brand-900/40 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
