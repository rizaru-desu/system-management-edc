import * as React from 'react'

import { cn } from '#/lib/utils.ts'

/**
 * White rounded surface with the console's thin lavender border — the base
 * container for tables, timeline cards, and stat tiles. Spacing, shadows,
 * and state-specific borders stay with the caller via `className`.
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-2xl border border-brand-100 bg-white', className)}
      {...props}
    />
  )
}

export { Card }
