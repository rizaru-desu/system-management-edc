import {
  CalendarDays,
  Mail,
  MapPin,
  Network,
  Phone,
  Radius,
  StickyNote,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Button } from '#/components/ui/button.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import type { ServicePointRecord } from '../data/service-points.ts'

interface ServicePointViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servicePoint: ServicePointRecord | null
  /** Resolved name of the parent record; null for top-level entries. */
  parentName: string | null
  /** Names from the root down to this record, e.g. Head Office → Jakarta. */
  hierarchyPath: Array<string>
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

/** Read-only detail dialog for the table's View action. */
export function ServicePointViewModal({
  open,
  onOpenChange,
  servicePoint,
  parentName,
  hierarchyPath,
}: ServicePointViewModalProps) {
  if (!servicePoint) return null

  const coordinates =
    servicePoint.latitude !== null && servicePoint.longitude !== null
      ? `${servicePoint.latitude}, ${servicePoint.longitude}`
      : null

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {servicePoint.name}
          <Badge variant="soft">{servicePoint.code}</Badge>
          <StatusPill active={servicePoint.status === 'active'} />
        </span>
      }
      description={
        hierarchyPath.length > 1
          ? hierarchyPath.join(' → ')
          : 'Top-level service point.'
      }
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
      contentClassName="space-y-4 py-1"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow icon={Network} label="Parent service point">
          {parentName ?? 'None (top level)'}
        </DetailRow>
        <DetailRow icon={MapPin} label="Region">
          {servicePoint.region || '—'}
        </DetailRow>
        <div className="sm:col-span-2">
          <DetailRow icon={MapPin} label="Address">
            {servicePoint.address || '—'}
            {coordinates && (
              <span className="mt-0.5 block text-xs text-brand-900/50 tabular-nums">
                {coordinates}
              </span>
            )}
          </DetailRow>
        </div>
        <DetailRow icon={Radius} label="Coverage radius">
          {servicePoint.coverageRadiusKm !== null ? (
            <span className="tabular-nums">
              {servicePoint.coverageRadiusKm} KM
            </span>
          ) : (
            'Unlimited'
          )}
        </DetailRow>
        <DetailRow icon={Phone} label="Phone">
          {servicePoint.phone || '—'}
        </DetailRow>
        <DetailRow icon={Mail} label="Email">
          {servicePoint.email || '—'}
        </DetailRow>
        <DetailRow icon={Users} label="Assigned users">
          {servicePoint.assignedUsers ?? '—'}
        </DetailRow>
        <DetailRow icon={CalendarDays} label="Created at">
          <span className="tabular-nums">{servicePoint.createdAt}</span>
        </DetailRow>
        {servicePoint.notes && (
          <div className="sm:col-span-2">
            <DetailRow icon={StickyNote} label="Notes">
              {servicePoint.notes}
            </DetailRow>
          </div>
        )}
      </div>

      {/* Leader/PIC intentionally absent: both come from the Service Point
        Assignment module (user ⇄ assignment ⇄ service point), not from
        this master record. */}
      <p className="rounded-lg bg-brand-500/5 px-3 py-2 text-xs text-brand-900/60">
        Leader, PIC and user assignment are managed through Service Point
        Assignments on the Users page.
      </p>
    </BaseModal>
  )
}
