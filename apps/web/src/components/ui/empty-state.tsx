import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils.ts'

interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon: LucideIcon
  /** `danger` renders the rose error treatment; `muted` the quiet empty one. */
  tone?: 'muted' | 'danger'
  title?: string
  description?: string
  /** Rendered below the text — typically a retry button. */
  action?: React.ReactNode
  /** Wraps the icon in the soft rounded chip used by richer empty states. */
  iconChip?: boolean
}

/**
 * Centered empty/error block shared by tables, tabs, and drawers so the
 * loading-adjacent states stay visually identical everywhere.
 */
function EmptyState({
  icon: Icon,
  tone = 'muted',
  title,
  description,
  action,
  iconChip = false,
  className,
  ...props
}: EmptyStateProps) {
  const icon = iconChip ? (
    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100/50 text-brand-900/30">
      <Icon className="h-7 w-7" strokeWidth={1.5} />
    </div>
  ) : (
    <Icon
      className={cn(
        'mb-2 h-8 w-8',
        tone === 'danger' ? 'text-rose-400' : 'text-brand-900/20',
      )}
      strokeWidth={1.5}
    />
  )

  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
      {...props}
    >
      {icon}
      {title && (
        <p
          className={cn(
            'text-sm',
            tone === 'danger'
              ? 'font-medium text-rose-600'
              : 'font-semibold text-brand-900/70',
          )}
        >
          {title}
        </p>
      )}
      {description && (
        <p
          className={cn(
            'text-brand-900/40',
            title ? 'mt-1 text-xs' : 'text-sm',
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export { EmptyState }
