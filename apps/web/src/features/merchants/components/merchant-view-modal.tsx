import {
  CalendarDays,
  Landmark,
  Mail,
  MapPin,
  MapPinned,
  Network,
  Phone,
  Store,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import { formatDateTime } from '../data/merchants.ts'
import type { MerchantRecord } from '../data/merchants.ts'

interface MerchantViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchant: MerchantRecord | null
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
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3F6FA8]/10 text-[#3F6FA8]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0E2748]/45">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-[#0E2748]/80">{children}</div>
      </div>
    </div>
  )
}

/** Section heading separating the merchant/address/audit blocks. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-[#DDE0EC] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0E2748]/45">
      {children}
    </p>
  )
}

/** Read-only detail dialog for the table's View action. */
export function MerchantViewModal({
  open,
  onOpenChange,
  merchant,
}: MerchantViewModalProps) {
  if (!merchant) return null

  const coordinates =
    merchant.latitude !== null && merchant.longitude !== null
      ? `${merchant.latitude}, ${merchant.longitude}`
      : null

  const regionLine = [merchant.district, merchant.city, merchant.province]
    .filter(Boolean)
    .join(', ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-light max-h-[90vh] overflow-y-auto border-[#DDE0EC] bg-white text-[#0E2748] sm:max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="font-display text-xl font-bold text-[#0E2748]">
              {merchant.name}
            </DialogTitle>
            <Badge variant="soft">{merchant.code}</Badge>
            <StatusPill active={merchant.status === 'active'} />
          </div>
          <DialogDescription className="text-[#0E2748]/60">
            {merchant.type ? `${merchant.type} merchant` : 'Merchant'} served by{' '}
            {merchant.servicePointName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-4">
            <SectionTitle>Merchant information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Store} label="Merchant type">
                {merchant.type || '—'}
              </DetailRow>
              <DetailRow icon={UserRound} label="PIC name">
                {merchant.picName || '—'}
              </DetailRow>
              <DetailRow icon={Phone} label="Phone number">
                <span className="tabular-nums">{merchant.phone || '—'}</span>
              </DetailRow>
              <DetailRow icon={Mail} label="Email">
                {merchant.email || '—'}
              </DetailRow>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Address information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <DetailRow icon={MapPin} label="Address">
                  {merchant.address || '—'}
                  {regionLine && (
                    <span className="mt-0.5 block text-xs text-[#0E2748]/50">
                      {regionLine}
                      {merchant.postalCode && ` ${merchant.postalCode}`}
                    </span>
                  )}
                </DetailRow>
              </div>
              <DetailRow icon={Landmark} label="Province">
                {merchant.province || '—'}
              </DetailRow>
              <DetailRow icon={MapPinned} label="Coordinates">
                {coordinates ? (
                  <span className="tabular-nums">{coordinates}</span>
                ) : (
                  '—'
                )}
              </DetailRow>
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle>Service point &amp; audit</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Network} label="Service point">
                {merchant.servicePointName}
                {merchant.distanceToServicePointKm !== null && (
                  <span className="mt-0.5 block text-xs text-[#0E2748]/50 tabular-nums">
                    {merchant.distanceToServicePointKm.toFixed(2)} km away
                    (auto-assigned)
                  </span>
                )}
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Created date">
                <span className="tabular-nums">
                  {formatDateTime(merchant.createdAt)}
                </span>
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Updated date">
                <span className="tabular-nums">
                  {formatDateTime(merchant.updatedAt)}
                </span>
              </DetailRow>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
