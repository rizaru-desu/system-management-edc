import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ClipboardList,
  HardHat,
  Mail,
  MapPin,
  Pencil,
  TriangleAlert,
  UserRound,
  Warehouse,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Card } from '#/components/ui/card.tsx'
import { EmptyState } from '#/components/ui/empty-state.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { RoleBadge } from '#/features/users/index.ts'
import { specializationLabel } from '../data/field-engineers.ts'
import type { FieldEngineerRecord } from '../data/field-engineers.ts'
import {
  EngineerStatusPill,
  ProfileStatusBadge,
} from './field-engineers-table.tsx'

interface FieldEngineerDetailPageProps {
  engineer: FieldEngineerRecord | null
  isPending: boolean
  isError: boolean
  errorMessage: string
  onRetry: () => void
  /** Opens the profile form pre-seeded with this engineer. */
  onEditProfile: (record: FieldEngineerRecord) => void
}

/** Label + value row of the identity/profile sections. */
function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-900/60">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-900/50">
          {label}
        </p>
        <div className="text-sm text-brand-900">{children}</div>
      </div>
    </div>
  )
}

/**
 * Service Operations → Field Engineers → detail. Identity is sourced from
 * the User record (Users & Roles owns it); the profile section shows the
 * work-specific fields this module manages. Job Order History stays an
 * empty placeholder until the Job Orders module exists.
 */
export function FieldEngineerDetailPage({
  engineer,
  isPending,
  isError,
  errorMessage,
  onRetry,
  onEditProfile,
}: FieldEngineerDetailPageProps) {
  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/engineers"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-900/60 hover:text-brand-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Field Engineers
          </Link>
          {isPending ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <h1 className="font-display mb-1 text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
              {engineer?.name ?? 'Field Engineer'}
            </h1>
          )}
          {engineer && (
            <div className="flex flex-wrap items-center gap-1.5">
              <RoleBadge role="Field_Service_Engineer" short />
              <ProfileStatusBadge complete={Boolean(engineer.profile)} />
              {engineer.profile && (
                <EngineerStatusPill status={engineer.profile.status} />
              )}
            </div>
          )}
        </div>
        {engineer && (
          <Button onClick={() => onEditProfile(engineer)}>
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            {engineer.profile ? 'Edit profile' : 'Complete profile'}
          </Button>
        )}
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={TriangleAlert}
            tone="danger"
            title={errorMessage}
            action={
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            }
          />
        </Card>
      )}

      {!isError && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Identity — owned by Users & Roles. */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-900">Identity</h2>
              <span className="text-[11px] text-brand-900/40">
                from Users &amp; Roles
              </span>
            </div>
            {isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            ) : engineer ? (
              <div className="space-y-4">
                <DetailRow icon={UserRound} label="Name">
                  {engineer.name}
                </DetailRow>
                <DetailRow icon={Mail} label="Email">
                  {engineer.email}
                </DetailRow>
              </div>
            ) : (
              <EmptyState
                icon={UserRound}
                title="Engineer not found"
                description="This user does not hold the Field Service Engineer role."
              />
            )}
          </Card>

          {/* Work profile — owned by this module. */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-900">
                Work Profile
              </h2>
            </div>
            {isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ) : engineer?.profile ? (
              <div className="space-y-4">
                <DetailRow icon={Warehouse} label="Warehouse / Service Point">
                  {engineer.profile.warehouseName || '—'}
                </DetailRow>
                <DetailRow icon={MapPin} label="Coverage Region">
                  {engineer.profile.coverageRegion}
                </DetailRow>
                <DetailRow icon={HardHat} label="Specializations">
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {engineer.profile.specializations.map((key) => (
                      <span
                        key={key}
                        className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-brand-900/70"
                      >
                        {specializationLabel(key)}
                      </span>
                    ))}
                  </span>
                </DetailRow>
              </div>
            ) : (
              <EmptyState
                icon={HardHat}
                iconChip
                title="Profile not set up yet"
                description="Assign a warehouse, coverage region and specializations to make this engineer schedulable."
                action={
                  engineer ? (
                    <Button size="sm" onClick={() => onEditProfile(engineer)}>
                      Complete profile
                    </Button>
                  ) : undefined
                }
              />
            )}
          </Card>

          {/* Job order history — placeholder until Job Orders exists. */}
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-brand-900">
              Job Order History
            </h2>
            <EmptyState
              icon={ClipboardList}
              iconChip
              title="No job orders yet"
              description="Once the Job Orders module is live, this engineer's assignments and completions will show up here."
            />
          </Card>
        </div>
      )}
    </div>
  )
}
