import { Link } from '@tanstack/react-router'
import { ArrowLeft, RotateCcw, TriangleAlert } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'

import type { ErrorComponentProps } from '@tanstack/react-router'

export function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <main className="theme-light flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
        <TriangleAlert className="size-8" />
      </div>

      <p className="mt-8 text-sm font-bold tracking-[0.2em] text-brand-500 uppercase">
        Unexpected error
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-900/60">
        An unexpected error occurred while loading this page. Try again, or go
        back to sign in.
      </p>

      {import.meta.env.DEV && (
        <pre className="mt-6 max-h-48 w-full max-w-xl overflow-auto rounded-xl border border-brand-100 bg-white p-4 text-left text-xs text-red-600">
          {error.stack ?? error.message}
        </pre>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          onClick={reset}
          className="h-11 px-6 font-semibold shadow-[0_10px_24px_rgba(63,114,175,0.35)]"
        >
          <RotateCcw />
          Try again
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 px-6 font-semibold"
        >
          <Link to="/login">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>
    </main>
  )
}
