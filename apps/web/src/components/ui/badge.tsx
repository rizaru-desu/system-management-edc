import * as React from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '#/lib/utils.ts'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        /** Neutral chip (sign-in methods, version tags). */
        soft: 'bg-brand-100 text-brand-900/70',
        /** De-emphasized chip (inactive states). */
        muted: 'bg-brand-100 text-brand-900/50',
        success: 'bg-emerald-100 text-emerald-700',
        danger: 'bg-rose-100 text-rose-700',
        sky: 'bg-sky-100 text-sky-700',
        /** Solid accent chip ("Current" markers). */
        primary: 'bg-brand-500 text-white',
      },
      size: {
        default: 'px-2.5 py-0.5 text-[11px]',
        sm: 'px-2 py-0.5 text-[10px]',
      },
    },
    defaultVariants: {
      variant: 'soft',
      size: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
