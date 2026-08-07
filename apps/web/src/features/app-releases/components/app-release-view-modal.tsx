import {
  CalendarDays,
  FileDigit,
  FileText,
  HardDrive,
  Link2,
  MonitorSmartphone,
  PackageCheck,
  Radio,
  ShieldAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { BaseModal } from '#/components/ui/base-modal.tsx'
import { StatusPill } from '#/components/ui/status-pill.tsx'
import {
  PLATFORM_LABELS,
  UPDATE_TYPE_LABELS,
  formatDateTime,
  formatFileSize,
} from '../data/app-releases.ts'
import type { AppReleaseRecord } from '../data/app-releases.ts'

interface AppReleaseViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  release: AppReleaseRecord | null
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

/** Read-only detail dialog for the table's View action. */
export function AppReleaseViewModal({
  open,
  onOpenChange,
  release,
}: AppReleaseViewModalProps) {
  if (!release) return null

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={
        <span className="flex flex-wrap items-center gap-2">
          Release {release.versionName}
          <Badge variant="soft">{PLATFORM_LABELS[release.platform]}</Badge>
          <Badge variant={release.updateType === 'ota' ? 'sky' : 'soft'}>
            {UPDATE_TYPE_LABELS[release.updateType]}
          </Badge>
          {release.isLatest && (
            <Badge variant="primary" size="sm">
              Latest
            </Badge>
          )}
          <StatusPill active={release.isActive} />
        </span>
      }
      description={
        release.isActive
          ? 'This release is currently served to devices by the update check.'
          : 'This release is inactive — devices do not receive it.'
      }
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
      contentClassName="py-1"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow icon={PackageCheck} label="Version">
          <span className="tabular-nums">
            {release.versionName} (build {release.versionCode})
          </span>
        </DetailRow>
        <DetailRow icon={MonitorSmartphone} label="Minimum version">
          <span className="tabular-nums">{release.minimumVersion}</span>
        </DetailRow>
        <div className="sm:col-span-2">
          <DetailRow icon={Link2} label="Download URL">
            {release.downloadUrl ? (
              <a
                href={release.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-[#3F6FA8] underline-offset-2 hover:underline"
              >
                {release.downloadUrl}
              </a>
            ) : (
              '—'
            )}
          </DetailRow>
        </div>
        <DetailRow icon={HardDrive} label="File size">
          <span className="tabular-nums">
            {formatFileSize(release.fileSize)}
          </span>
        </DetailRow>
        <DetailRow icon={FileDigit} label="Checksum">
          {release.checksum ? (
            <span className="break-all font-mono text-xs">
              {release.checksum}
            </span>
          ) : (
            '—'
          )}
        </DetailRow>
        <DetailRow icon={ShieldAlert} label="Force update">
          {release.forceUpdate ? <Badge variant="danger">Forced</Badge> : 'No'}
        </DetailRow>
        {release.updateType === 'ota' && (
          <DetailRow icon={Radio} label="OTA channel">
            {release.channel}
            <span className="mt-0.5 block text-xs text-[#0E2748]/50">
              Runtime {release.runtimeVersion}
            </span>
          </DetailRow>
        )}
        <DetailRow icon={CalendarDays} label="Published at">
          <span className="tabular-nums">
            {formatDateTime(release.publishedAt)}
          </span>
        </DetailRow>
        <DetailRow icon={CalendarDays} label="Created / updated">
          <span className="tabular-nums">
            {formatDateTime(release.createdAt)}
          </span>
          <span className="mt-0.5 block text-xs text-[#0E2748]/50 tabular-nums">
            updated {formatDateTime(release.updatedAt)}
          </span>
        </DetailRow>
        <div className="sm:col-span-2">
          <DetailRow icon={FileText} label="Changelog">
            {release.changelog ? (
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#3F6FA8]/5 px-3 py-2 font-sans text-sm text-[#0E2748]/80">
                {release.changelog}
              </pre>
            ) : (
              '—'
            )}
          </DetailRow>
        </div>
      </div>
    </BaseModal>
  )
}
