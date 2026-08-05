import { ROLES } from '#/features/console/index.ts'
import { cn } from '#/lib/utils.ts'

interface RoleBadgeProps {
  /** A role key as stored in the DB, not necessarily in the catalogue. */
  role: string
  /** Use the short label (e.g. "SysAdmin") instead of the full one. */
  short?: boolean
  className?: string
}

export function RoleBadge({ role, short = false, className }: RoleBadgeProps) {
  const meta = ROLES.find((item) => item.key === role)
  // Keys outside the console catalogue (e.g. the default `user` role) still
  // get a tag — neutral colors, key humanized — so the list mirrors the DB.
  const label = meta
    ? short
      ? meta.short
      : meta.label
    : role.replace(/[_-]+/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        meta ? meta.color : 'bg-brand-100 text-brand-900/70',
        className,
      )}
    >
      {label}
    </span>
  )
}
