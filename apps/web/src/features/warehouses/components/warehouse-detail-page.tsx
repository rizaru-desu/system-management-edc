import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowLeftRight,
  Boxes,
  CalendarDays,
  Contact,
  CreditCard,
  MapPin,
  Network,
  SearchX,
  UserRound,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import { WAREHOUSE_TYPE_LABELS, getWarehouses } from '../data/warehouses.ts'
import type { WarehouseType } from '../data/warehouses.ts'
import { buildHierarchyPath } from '../lib/tree.ts'

/** Same per-type badge looks as the list table. */
const TYPE_BADGE_VARIANTS: Record<
  WarehouseType,
  React.ComponentProps<typeof Badge>['variant']
> = {
  central: 'primary',
  regional: 'sky',
  'service-point': 'success',
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/45">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-brand-900/80">{children}</div>
      </div>
    </div>
  )
}

interface WarehouseDetailPageProps {
  warehouseId: string
}

/**
 * Inventory → Warehouses → detail. Reads the shared mock store (same data
 * the list page manages); the child list links onwards through the
 * hierarchy, and the Terminals / Stock Movements sections are placeholders
 * until those modules land.
 */
export function WarehouseDetailPage({ warehouseId }: WarehouseDetailPageProps) {
  // Snapshot per navigation is enough for the mock stage — the store only
  // changes on the list page, which unmounts this one.
  const records = getWarehouses()
  const warehouse = records.find((record) => record.id === warehouseId) ?? null

  if (!warehouse) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={SearchX}
          iconChip
          title="Warehouse not found"
          description="It may have been removed, or the link is out of date."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/warehouses">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back to warehouses
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const parent = warehouse.parentId
    ? (records.find((record) => record.id === warehouse.parentId) ?? null)
    : null
  const children = records.filter((record) => record.parentId === warehouse.id)
  const hierarchyPath = buildHierarchyPath(records, warehouse.id)

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
          Inventory · Warehouses
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild>
            <Link to="/warehouses" aria-label="Back to warehouses">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            {warehouse.name}
          </h1>
          <Badge variant={TYPE_BADGE_VARIANTS[warehouse.type]}>
            {WAREHOUSE_TYPE_LABELS[warehouse.type]}
          </Badge>
          <StatusPill active={warehouse.status === 'active'} />
        </div>
        <p className="mt-1 text-sm text-brand-900/60">
          {hierarchyPath.length > 1
            ? hierarchyPath.join(' → ')
            : 'Top-level Central warehouse.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Warehouse information */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
            Warehouse information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow icon={Warehouse} label="Warehouse code">
              <span className="tabular-nums">{warehouse.code}</span>
            </DetailRow>
            <DetailRow icon={Network} label="Parent warehouse">
              {parent ? (
                <Link
                  to="/warehouses/$warehouseId"
                  params={{ warehouseId: parent.id }}
                  className="text-brand-600 underline-offset-2 hover:underline"
                >
                  {parent.name} ({parent.code})
                </Link>
              ) : (
                'None (top level)'
              )}
            </DetailRow>
            <DetailRow icon={MapPin} label="Region">
              {warehouse.region}
            </DetailRow>
            <div className="sm:col-span-2">
              <DetailRow icon={MapPin} label="Address">
                {warehouse.address}
              </DetailRow>
            </div>
            <DetailRow icon={UserRound} label="PIC">
              {warehouse.picName}
            </DetailRow>
            <DetailRow icon={Contact} label="PIC contact">
              {warehouse.picContact || '—'}
            </DetailRow>
            <DetailRow icon={Boxes} label="Capacity">
              {warehouse.capacity !== null ? (
                <span className="tabular-nums">
                  {warehouse.capacity.toLocaleString()} units
                </span>
              ) : (
                'Not set'
              )}
            </DetailRow>
            <DetailRow icon={CalendarDays} label="Created at">
              <span className="tabular-nums">{warehouse.createdAt}</span>
            </DetailRow>
          </div>
        </Card>

        {/* Sub-warehouses (only meaningful for Central/Regional levels) */}
        {warehouse.type !== 'service-point' && (
          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
                {warehouse.type === 'central'
                  ? 'Regional warehouses under this Central'
                  : 'Service Points under this Regional'}
              </h2>
              <span className="text-xs text-brand-900/50 tabular-nums">
                {children.length}{' '}
                {children.length === 1 ? 'warehouse' : 'warehouses'}
              </span>
            </div>
            {children.length === 0 ? (
              <EmptyState
                icon={Warehouse}
                iconChip
                title="No sub-warehouses yet"
                description="Warehouses created under this one will appear here."
              />
            ) : (
              <table className="mt-3 w-full min-w-2xl text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-[11px] uppercase tracking-wider text-brand-900/50">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Region</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Terminals
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    <tr
                      key={child.id}
                      className="border-b border-brand-100 last:border-0 hover:bg-brand-50/60"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to="/warehouses/$warehouseId"
                          params={{ warehouseId: child.id }}
                          className="font-medium text-brand-900 underline-offset-2 hover:underline"
                        >
                          {child.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-brand-900/80 tabular-nums">
                        {child.code}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={TYPE_BADGE_VARIANTS[child.type]}>
                          {WAREHOUSE_TYPE_LABELS[child.type]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-brand-900/70">
                        {child.region}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill active={child.status === 'active'} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-brand-900/70 tabular-nums">
                        {child.terminalCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {/* Placeholder sections for the upcoming modules */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
              Terminals in this warehouse
            </h2>
            <EmptyState
              icon={CreditCard}
              iconChip
              title="Coming with the Terminals module"
              description="The live terminal list stored at this warehouse will appear here."
            />
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
              Stock movement history
            </h2>
            <EmptyState
              icon={ArrowLeftRight}
              iconChip
              title="Coming with the Stock Movements module"
              description="Inbound and outbound movements touching this warehouse will appear here."
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
