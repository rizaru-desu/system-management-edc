import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CreditCard,
  FolderKanban,
  Loader2,
  Pencil,
  SearchX,
  Smartphone,
  StickyNote,
  Store,
  TriangleAlert,
  Warehouse,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { isDuplicateSerialError } from '../api/list-terminals.ts'
import { terminalDetailQueryOptions } from '../api/terminal-detail.ts'
import { terminalHistoryQueryOptions } from '../api/terminal-history.ts'
import { useUpdateTerminal } from '../api/update-terminal.ts'
import {
  TERMINAL_CONDITION_LABELS,
  TERMINAL_STATUS_BADGE_CLASSES,
  TERMINAL_STATUS_LABELS,
} from '../data/terminals.ts'
import type { TerminalRecord, TerminalStatus } from '../data/terminals.ts'
import { TerminalFormModal } from './terminal-form-modal.tsx'
import type { TerminalFormValues } from './terminal-form-modal.tsx'

/** Same per-type badge looks as the warehouses module. */
const WAREHOUSE_TYPE_BADGES: Record<
  string,
  { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
  central: { label: 'Central', variant: 'primary' },
  regional: { label: 'Regional', variant: 'sky' },
  'service-point': { label: 'Service Point', variant: 'success' },
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

/** Compact status chip used inside the movement-history timeline. */
function HistoryStatusBadge({ status }: { status: TerminalStatus }) {
  return (
    <Badge size="sm" className={TERMINAL_STATUS_BADGE_CLASSES[status]}>
      {TERMINAL_STATUS_LABELS[status]}
    </Badge>
  )
}

/**
 * The Movement History card — fed by the dedicated GET /terminals/:id/history
 * endpoint (newest first) with its own loading/error states, so the rest of
 * the page never blocks on it. Rows are written automatically by the backend
 * whenever the terminal's status or warehouse changes.
 */
function MovementHistoryCard({ terminalId }: { terminalId: string }) {
  const historyQuery = useQuery(terminalHistoryQueryOptions(terminalId))
  const entries = historyQuery.data ?? []

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
        Movement history
      </h2>

      {historyQuery.isPending ? (
        <div className="flex items-center justify-center py-10 text-sm text-brand-900/50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading movement history…
        </div>
      ) : historyQuery.isError ? (
        <EmptyState
          icon={TriangleAlert}
          tone="danger"
          title={
            historyQuery.error instanceof Error
              ? historyQuery.error.message
              : 'Failed to load the movement history.'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => historyQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          iconChip
          title="No movements recorded yet"
          description="History is recorded automatically whenever this terminal moves between warehouses or changes status."
        />
      ) : (
        <ol className="mt-4 space-y-0">
          {entries.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
              {/* Timeline rail */}
              {index < entries.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-brand-100"
                />
              )}
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.fromStatus ? (
                    <>
                      <HistoryStatusBadge status={entry.fromStatus} />
                      <ArrowRight
                        className="h-3.5 w-3.5 text-brand-900/40"
                        strokeWidth={1.75}
                      />
                      <HistoryStatusBadge status={entry.toStatus} />
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-brand-900/80">
                        Registered as
                      </span>
                      <HistoryStatusBadge status={entry.toStatus} />
                    </>
                  )}
                </div>
                {(entry.fromWarehouseName || entry.toWarehouseName) && (
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-brand-900/60">
                    <Warehouse
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={1.75}
                    />
                    {entry.fromWarehouseName &&
                    entry.toWarehouseName &&
                    entry.fromWarehouseName !== entry.toWarehouseName ? (
                      <>
                        {entry.fromWarehouseName}
                        <ArrowRight
                          className="h-3 w-3 shrink-0"
                          strokeWidth={1.75}
                        />
                        {entry.toWarehouseName}
                      </>
                    ) : (
                      (entry.toWarehouseName ?? entry.fromWarehouseName)
                    )}
                  </p>
                )}
                {entry.notes && (
                  <p className="mt-1 text-xs text-brand-900/60">
                    {entry.notes}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-brand-900/45">
                  <span className="tabular-nums">{entry.changedAt}</span>
                  {entry.changedByName && <> · by {entry.changedByName}</>}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

interface TerminalDetailPageProps {
  terminalId: string
}

/**
 * Terminal Lifecycle → Terminals → detail. The record comes from GET
 * /terminals/:id (display fields joined), edits go through the shared form
 * modal + PATCH /terminals/:id, and the Movement History section lazy-loads
 * the real status/warehouse transition log. Maintenance history stays a
 * placeholder until the Service Operations module lands.
 */
export function TerminalDetailPage({ terminalId }: TerminalDetailPageProps) {
  const detailQuery = useQuery(terminalDetailQueryOptions(terminalId))

  const [formOpen, setFormOpen] = useState(false)
  // Bumped on every duplicate-serial 409 so the form modal highlights the
  // serial field without losing the entered values.
  const [duplicateSerialConflict, setDuplicateSerialConflict] = useState(0)

  // The mutation owns toasts and invalidates the shared base key, so this
  // page's detail query (and the history section) refetch after a save.
  const updateTerminal = useUpdateTerminal()

  if (detailQuery.isPending) {
    return (
      <div className="animate-fade-up flex items-center justify-center py-24 text-sm text-brand-900/50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
        Loading terminal…
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={TriangleAlert}
          tone="danger"
          title={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : 'Failed to load the terminal.'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => detailQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  const terminal = detailQuery.data
  // A 404 resolves to null (see the detail server fn).
  if (terminal === null) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={SearchX}
          iconChip
          title="Terminal not found"
          description="It may have been removed, or the link is out of date."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/terminals">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back to terminals
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const warehouseBadge = terminal.warehouseType
    ? WAREHOUSE_TYPE_BADGES[terminal.warehouseType]
    : null

  const openEdit = () => {
    setDuplicateSerialConflict(0)
    setFormOpen(true)
  }

  const handleSubmit = (values: TerminalFormValues) => {
    // The form validated the required selects before submitting.
    updateTerminal.mutate(
      {
        id: terminal.id,
        serialNumber: values.serialNumber,
        productId: values.productId,
        warehouseId: values.warehouseId || null,
        status: values.status as TerminalStatus,
        condition: values.condition as TerminalRecord['condition'],
        merchantId: values.merchantId || null,
        entryDate: values.entryDate,
        notes: values.notes,
      },
      {
        onSuccess: () => setFormOpen(false),
        onError: (error: unknown) => {
          if (isDuplicateSerialError(error)) {
            setDuplicateSerialConflict((previous) => previous + 1)
          }
        },
      },
    )
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">
            Terminal Lifecycle · Terminals
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon-sm" asChild>
              <Link to="/terminals" aria-label="Back to terminals">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
              {terminal.serialNumber}
            </h1>
            <Badge className={TERMINAL_STATUS_BADGE_CLASSES[terminal.status]}>
              {TERMINAL_STATUS_LABELS[terminal.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-brand-900/60">
            {terminal.productModelName} · {terminal.productBrand}
          </p>
        </div>
        <Button onClick={openEdit}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
          Edit terminal
        </Button>
      </div>

      <div className="space-y-4">
        {/* Terminal information */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-900/50">
            Terminal information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow icon={Smartphone} label="Product">
              {terminal.productModelName}
              <span className="mt-0.5 block text-xs text-brand-900/50">
                {terminal.productBrand}
              </span>
            </DetailRow>
            <DetailRow icon={Warehouse} label="Current warehouse">
              {terminal.warehouseName ? (
                <span className="flex flex-wrap items-center gap-2">
                  {terminal.warehouseName}
                  {warehouseBadge && (
                    <Badge variant={warehouseBadge.variant} size="sm">
                      {warehouseBadge.label}
                    </Badge>
                  )}
                </span>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow icon={CreditCard} label="Condition">
              {TERMINAL_CONDITION_LABELS[terminal.condition]}
            </DetailRow>
            <DetailRow icon={Store} label="Installed merchant">
              {terminal.merchantName || 'Not installed at a merchant'}
            </DetailRow>
            <DetailRow icon={FolderKanban} label="Project allocation">
              {terminal.projectName ? (
                <>
                  {terminal.projectName}
                  {terminal.projectCode && (
                    <span className="mt-0.5 block text-xs text-brand-900/50">
                      {terminal.projectCode}
                    </span>
                  )}
                </>
              ) : (
                'Free stock — not allocated to a project'
              )}
            </DetailRow>
            <DetailRow icon={CalendarDays} label="Entry date">
              <span className="tabular-nums">{terminal.entryDate}</span>
            </DetailRow>
            {terminal.notes && (
              <DetailRow icon={StickyNote} label="Notes">
                {terminal.notes}
              </DetailRow>
            )}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <MovementHistoryCard terminalId={terminal.id} />

          {/* Placeholder until the Service Operations module lands */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
              Maintenance history
            </h2>
            <EmptyState
              icon={Wrench}
              iconChip
              title="Coming with the Service Operations module"
              description="Repairs and service visits touching this terminal will appear here."
            />
          </Card>
        </div>
      </div>

      <TerminalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        terminal={terminal}
        saving={updateTerminal.isPending}
        duplicateSerialConflict={duplicateSerialConflict}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
