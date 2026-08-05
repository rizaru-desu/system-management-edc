import * as React from 'react'

import { cn } from '#/lib/utils.ts'
import { Badge } from './badge.tsx'

/**
 * Active/Inactive pill with a leading status dot — shared by the users table
 * and the device drawer so both always render the same status treatment.
 */
function StatusPill({
  active,
  className,
  ...props
}: React.ComponentProps<'span'> & { active: boolean }) {
  return (
    <Badge
      variant={active ? 'success' : 'muted'}
      className={cn('gap-1.5', className)}
      {...props}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-brand-900/30',
        )}
      />
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}

export { StatusPill }
