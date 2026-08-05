import { useLocation } from '@tanstack/react-router'
import { Construction, Sparkles } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { findMenuEntry } from '../data/menu.ts'

function humanize(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function PlaceholderPage() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\//, '')

  const entry = findMenuEntry(slug)
  const parent = entry?.group.parent ?? 'Module'
  const title = entry?.sub.title ?? humanize(slug)

  return (
    <div className="animate-fade-up">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3F6FA8]">
        {parent}
      </p>
      <h1 className="font-display mb-2 text-3xl font-bold tracking-tight text-[#0E2748] md:text-4xl">
        {title}
      </h1>
      <p className="max-w-xl text-sm text-[#0E2748]/60">
        This module is part of the EDC.OS console blueprint. The interface for{' '}
        <span className="font-semibold text-[#0E2748]">{title}</span> will be
        wired up in the next iteration.
      </p>

      <div className="relative mt-8 max-w-2xl overflow-hidden rounded-2xl border border-[#DDE0EC] bg-white p-8">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#3F6FA8]/10 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0E2748] text-white">
            <Construction className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h3 className="font-display mb-2 text-xl font-semibold text-[#0E2748]">
            Coming up next.
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-[#0E2748]/70">
            We are scaffolding the navigation and role-based access first. Once
            the shell is approved, each module here will host its tables,
            filters, forms and live data feeds.
          </p>
          <div className="flex gap-2">
            <Button>
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              Request module
            </Button>
            <Button variant="outline">View specs</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
