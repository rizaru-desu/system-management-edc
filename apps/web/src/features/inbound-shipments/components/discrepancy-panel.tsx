import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  CheckCircle2,
  CircleCheckBig,
  Loader2,
  Mail,
  MessageSquareReply,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { useQuery } from '@tanstack/react-query'
import {
  useConfirmDiscrepancy,
  useResolveDiscrepancy,
  useSendDiscrepancyReport,
} from '../api/discrepancy-actions.ts'
import { discrepancyReportQueryOptions } from '../api/discrepancy-report.ts'
import {
  DISCREPANCY_STATUS_BADGE_CLASSES,
  DISCREPANCY_STATUS_LABELS,
  PARTNER_RESPONSE_LABELS,
  SHIPMENT_STATUS_BADGE_CLASSES,
  SHIPMENT_STATUS_LABELS,
} from '../data/inbound-shipments.ts'
import type {
  DiscrepancyEvent,
  DiscrepancyPartnerResponse,
  InboundShipmentRecord,
} from '../data/inbound-shipments.ts'

const EVENT_LABELS: Record<DiscrepancyEvent['action'], string> = {
  REPORTED: 'Report emailed to partner',
  CONFIRMED: 'Partner confirmation recorded',
  RESOLVED: 'Case resolved',
}

const EVENT_ICONS: Record<DiscrepancyEvent['action'], typeof Mail> = {
  REPORTED: Mail,
  CONFIRMED: MessageSquareReply,
  RESOLVED: CircleCheckBig,
}

function formatEventTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

/** One row of the follow-up timeline. */
function EventRow({ event }: { event: DiscrepancyEvent }) {
  const Icon = EVENT_ICONS[event.action]
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
        <Icon className="h-3.5 w-3.5 text-brand-600" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 text-sm leading-tight">
        <p className="font-medium text-brand-900">
          {EVENT_LABELS[event.action]}
          {event.partnerResponse && (
            <span className="ml-1.5 font-normal text-brand-900/70">
              — {PARTNER_RESPONSE_LABELS[event.partnerResponse]}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-brand-900/50">
          {formatEventTime(event.createdAt)}
          {event.actorName && <> · by {event.actorName}</>}
          {event.recipientEmail && <> · to {event.recipientEmail}</>}
        </p>
        {event.notes && (
          <p className="mt-0.5 text-xs text-brand-900/60">{event.notes}</p>
        )}
      </div>
    </li>
  )
}

interface DiscrepancyPanelProps {
  shipment: InboundShipmentRecord
}

/**
 * The discrepancy follow-up panel on a finalized shipment: the SOP's
 * "Laporkan perbedaan → Confirm / kirim kekurangan" loop made visible.
 * Shows where the case stands (status badge + event timeline + linked
 * follow-up DOs) and drives it forward — email the report to the partner,
 * record the partner's answer, and close the case. A follow-up shipment
 * completing closes the case automatically server-side.
 */
export function DiscrepancyPanel({ shipment }: DiscrepancyPanelProps) {
  const status = shipment.discrepancyStatus
  const sendReport = useSendDiscrepancyReport(shipment.id)
  const confirmCase = useConfirmDiscrepancy(shipment.id)
  const resolveCase = useResolveDiscrepancy(shipment.id)

  const [sendOpen, setSendOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)

  // Prefill the recipient with the partner PIC's email from the report.
  const reportQuery = useQuery({
    ...discrepancyReportQueryOptions(shipment.id),
    enabled: sendOpen,
  })
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [response, setResponse] =
    useState<DiscrepancyPartnerResponse>('WILL_SEND_SHORTAGE')
  const [confirmNotes, setConfirmNotes] = useState('')
  const [resolveNotes, setResolveNotes] = useState('')

  // Finalized-clean and not-yet-finalized shipments have no case to show.
  if (!status || status === 'none') return null

  const active = status !== 'resolved'
  const busy =
    sendReport.isPending || confirmCase.isPending || resolveCase.isPending
  const effectiveRecipient =
    recipient.trim() || reportQuery.data?.partnerEmail || ''

  const submitSend = () => {
    sendReport.mutate(
      {
        recipientEmail: recipient.trim() || null,
        message: message.trim() || null,
      },
      {
        onSuccess: () => {
          setSendOpen(false)
          setMessage('')
        },
      },
    )
  }

  const submitConfirm = () => {
    confirmCase.mutate(
      { partnerResponse: response, notes: confirmNotes.trim() || null },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          setConfirmNotes('')
        },
      },
    )
  }

  const submitResolve = () => {
    resolveCase.mutate(
      { notes: resolveNotes.trim() || null },
      {
        onSuccess: () => {
          setResolveOpen(false)
          setResolveNotes('')
        },
      },
    )
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-900/50">
          Discrepancy follow-up
        </h2>
        <Badge size="sm" className={DISCREPANCY_STATUS_BADGE_CLASSES[status]}>
          {DISCREPANCY_STATUS_LABELS[status]}
        </Badge>
        {active && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setSendOpen(true)}
            >
              <Mail className="h-4 w-4" strokeWidth={1.75} />
              {status === 'open' ? 'Email report to partner' : 'Re-send report'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
            >
              <MessageSquareReply className="h-4 w-4" strokeWidth={1.75} />
              Record partner confirmation
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setResolveOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              Mark resolved
            </Button>
          </div>
        )}
      </div>

      {status === 'open' && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          The inspection closed with discrepancies that have not been raised
          with {shipment.partnerName} yet — email the report so the partner can
          confirm or send the shortage.
        </p>
      )}

      {/* Linked Delivery Orders: the parent this one fulfils, and the
          follow-ups fulfilling this one. */}
      {(shipment.parentDoNumber || shipment.followUpShipments.length > 0) && (
        <div className="mt-4 space-y-1.5 text-sm">
          {shipment.parentShipmentId && shipment.parentDoNumber && (
            <p className="text-brand-900/70">
              Follow-up shipment of{' '}
              <Link
                to="/inbound-shipments/$shipmentId"
                params={{ shipmentId: shipment.parentShipmentId }}
                className="inline-flex items-center gap-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                {shipment.parentDoNumber}
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Link>
            </p>
          )}
          {shipment.followUpShipments.map((followUp) => (
            <p key={followUp.id} className="text-brand-900/70">
              Shortage shipment{' '}
              <Link
                to="/inbound-shipments/$shipmentId"
                params={{ shipmentId: followUp.id }}
                className="inline-flex items-center gap-0.5 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                {followUp.doNumber}
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Link>{' '}
              <Badge
                size="sm"
                className={SHIPMENT_STATUS_BADGE_CLASSES[followUp.status]}
              >
                {SHIPMENT_STATUS_LABELS[followUp.status]}
              </Badge>{' '}
              <span className="text-xs text-brand-900/50">
                received {followUp.receivedDate}
              </span>
            </p>
          ))}
        </div>
      )}

      {shipment.discrepancyEvents.length > 0 && (
        <ul className="mt-4 space-y-3">
          {shipment.discrepancyEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}

      {/* Send-report modal */}
      <BaseModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        title="Email the discrepancy report"
        description={`The structured report for ${shipment.doNumber} is emailed to the partner and the case moves to Reported.`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSendOpen(false)}
              disabled={sendReport.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitSend}
              disabled={sendReport.isPending || !effectiveRecipient}
              title={
                effectiveRecipient
                  ? undefined
                  : 'The partner account has no PIC email — enter a recipient.'
              }
            >
              {sendReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              )}
              {sendReport.isPending ? 'Sending…' : 'Send report'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="discrepancy-recipient">Recipient</Label>
            <Input
              id="discrepancy-recipient"
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder={
                reportQuery.data?.partnerEmail ??
                'partner@example.com (no PIC email on file)'
              }
            />
            <p className="text-xs text-brand-900/50">
              Leave empty to use the partner PIC&apos;s email
              {reportQuery.data?.partnerEmail
                ? ` (${reportQuery.data.partnerEmail})`
                : ' — none on file for this partner'}
              .
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discrepancy-message">
              Covering note (optional)
            </Label>
            <Textarea
              id="discrepancy-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Anything the partner should know beyond the structured report."
              rows={3}
            />
          </div>
        </div>
      </BaseModal>

      {/* Confirm modal */}
      <BaseModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Record the partner's confirmation"
        description="Log how the partner answered the discrepancy report — by email, phone or otherwise."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={confirmCase.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submitConfirm} disabled={confirmCase.isPending}>
              {confirmCase.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <MessageSquareReply className="h-4 w-4" strokeWidth={1.75} />
              )}
              {confirmCase.isPending ? 'Saving…' : 'Record confirmation'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Partner&apos;s answer</Label>
            <Select
              value={response}
              onValueChange={(value) =>
                setResponse(value as DiscrepancyPartnerResponse)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(PARTNER_RESPONSE_LABELS) as Array<
                    [DiscrepancyPartnerResponse, string]
                  >
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-brand-900/50">
              “Will send the shortage” expects a follow-up DO — record it from
              the wizard with this shipment as its parent, and completing it
              resolves this case automatically.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-notes">Notes (optional)</Label>
            <Textarea
              id="confirm-notes"
              value={confirmNotes}
              onChange={(event) => setConfirmNotes(event.target.value)}
              placeholder="Who confirmed, through which channel, any reference number…"
              rows={3}
            />
          </div>
        </div>
      </BaseModal>

      {/* Resolve modal */}
      <BaseModal
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        title="Resolve the discrepancy case"
        description="Close the case by hand — shortage written off, replaced outside the system, or the dispute settled."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setResolveOpen(false)}
              disabled={resolveCase.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submitResolve} disabled={resolveCase.isPending}>
              {resolveCase.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              )}
              {resolveCase.isPending ? 'Resolving…' : 'Mark resolved'}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="resolve-notes">Resolution notes (optional)</Label>
          <Textarea
            id="resolve-notes"
            value={resolveNotes}
            onChange={(event) => setResolveNotes(event.target.value)}
            placeholder="How the case was settled."
            rows={3}
          />
        </div>
      </BaseModal>
    </Card>
  )
}
