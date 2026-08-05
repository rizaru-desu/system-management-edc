import type { ReactNode } from 'react'

import { BrandMark } from './brand-mark.tsx'

interface AuthShellProps {
  kicker: string
  title: string
  description?: string
  children: ReactNode
}

/**
 * Centered light card frame for the standalone auth pages (forgot / reset
 * password) — the same visual language as the login page's form panel.
 */
export function AuthShell({
  kicker,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="theme-light flex min-h-screen items-center justify-center bg-[#F6F7F9] p-6 sm:p-12">
      <div className="animate-fade-up w-full max-w-md">
        <BrandMark className="mb-10" />
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#3F6FA8]">
          {kicker}
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-[#0E2748] sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-[#0E2748]/60">{description}</p>
        )}
        {children}
      </div>
    </main>
  )
}
