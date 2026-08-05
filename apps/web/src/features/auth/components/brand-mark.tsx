import { cn } from '#/lib/utils.ts'

interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-brand-50 shadow-[0_8px_20px_rgba(63,114,175,0.35)]">
        E
      </span>
      <div className="leading-tight">
        <p className="text-base font-bold tracking-tight">EDC Management</p>
        <p className="text-xs font-medium opacity-60">System Console</p>
      </div>
    </div>
  )
}
