import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  CreditCard,
  Pencil,
  SearchX,
  Smartphone,
  Store,
  StickyNote,
  Warehouse,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import {
  TERMINAL_CONDITION_LABELS,
  TERMINAL_STATUS_BADGE_CLASSES,
  TERMINAL_STATUS_LABELS,
  findProductOption,
  findWarehouseOption,
  getTerminals,
  saveTerminals,
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

interface TerminalDetailPageProps {
  terminalId: string
}

/**
 * Terminal Lifecycle → Terminals → detail. Reads the shared mock store
 * (same data the list page manages) and edits through the shared form
 * modal. The movement and maintenance sections are placeholders until the
 * Stock Movements and Service Operations modules land.
 */
export function TerminalDetailPage({ terminalId }: TerminalDetailPageProps) {
  // Held in state so the shared edit modal can refresh this page in place.
  const [terminal, setTerminal] = useState<TerminalRecord | null>(
    () => getTerminals().find((record) => record.id === terminalId) ?? null,
  )
  const [formOpen, setFormOpen] = useState(false)

  if (!terminal) {
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

  const product = findProductOption(terminal.productId)
  const warehouse = findWarehouseOption(terminal.warehouseId)
  const warehouseBadge = warehouse
    ? WAREHOUSE_TYPE_BADGES[warehouse.type]
    : null

  /** Mock uniqueness check on serial, against the whole shared fleet. */
  const isSerialTaken = (serial: string) => {
    const candidate = serial.trim().toLowerCase()
    return getTerminals().some(
      (record) =>
        record.id !== terminal.id &&
        record.serialNumber.trim().toLowerCase() === candidate,
    )
  }

  const handleSubmit = (values: TerminalFormValues) => {
    const updated: TerminalRecord = {
      ...terminal,
      serialNumber: values.serialNumber,
      productId: values.productId,
      warehouseId: values.warehouseId,
      status: values.status as TerminalStatus,
      condition: values.condition as TerminalRecord['condition'],
      merchantName: values.merchantName,
      entryDate: values.entryDate,
      notes: values.notes,
    }
    saveTerminals(
      getTerminals().map((record) =>
        record.id === terminal.id ? updated : record,
      ),
    )
    setTerminal(updated)
    toast.success(`Terminal “${values.serialNumber}” updated.`)
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
            {product
              ? `${product.modelName} · ${product.brand}`
              : 'Unknown product model.'}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
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
              {product ? (
                <>
                  {product.modelName}
                  <span className="mt-0.5 block text-xs text-brand-900/50">
                    {product.brand}
                  </span>
                </>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow icon={Warehouse} label="Current warehouse">
              {warehouse ? (
                <span className="flex flex-wrap items-center gap-2">
                  {warehouse.name}
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

        {/* Placeholder sections for the upcoming modules */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
              Movement history
            </h2>
            <EmptyState
              icon={ArrowLeftRight}
              iconChip
              title="Coming with the Stock Movements module"
              description="History is recorded automatically whenever this terminal moves between warehouses or changes status."
            />
          </Card>
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
        isSerialTaken={isSerialTaken}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
