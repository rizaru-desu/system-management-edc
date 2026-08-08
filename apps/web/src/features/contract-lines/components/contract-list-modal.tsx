import { FileSignature } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import { documentStatusLabel } from '../data/contract-lines.ts'
import type { ContractLineRecord } from '../data/contract-lines.ts'

interface ContractListModalProps {
  isOpen: boolean
  onClose: () => void
  /** The actual contract line documents to list (not just a count). */
  contracts: Array<ContractLineRecord>
  /** Owning record context shown in the header, e.g. "PT Maju Bersama". */
  title?: string
  /** True while the contract list is still loading. */
  loading?: boolean
}

/**
 * Read-only list of the contract lines linked to one account or project —
 * opened from the Total Contracts column. Built on the shared BaseModal;
 * the row layout reuses the table's typography (line number, name, status
 * pill, document status badge, timeline).
 */
export function ContractListModal({
  isOpen,
  onClose,
  contracts,
  title,
  loading = false,
}: ContractListModalProps) {
  return (
    <BaseModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="md"
      title={title ? `Contracts — ${title}` : 'Contracts'}
      description={
        loading
          ? 'Loading the linked contract lines…'
          : `${contracts.length} linked contract line${
              contracts.length === 1 ? '' : 's'
            }.`
      }
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          iconChip
          title="No contract lines yet"
          description="Nothing links here — add one from Contract Lines."
        />
      ) : (
        <ul>
          {contracts.map((contract) => (
            <li
              key={contract.id}
              className="border-b border-brand-100 py-3 first:pt-0 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-900">
                    {contract.name}
                  </p>
                  <p className="text-xs text-brand-900/50 tabular-nums">
                    {contract.lineNumber}
                    {contract.serviceItem ? ` · ${contract.serviceItem}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="soft">
                    {documentStatusLabel(contract.documentStatus)}
                  </Badge>
                  <StatusPill active={contract.status === 'active'} />
                </div>
              </div>
              {(contract.startDate || contract.endDate) && (
                <p className="mt-1 text-xs text-brand-900/50 tabular-nums">
                  {contract.startDate || '—'} → {contract.endDate || '—'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </BaseModal>
  )
}
