import { Link } from '@tanstack/react-router'
import { ArrowLeft, SearchX } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'

export function NotFound() {
  return (
    <main className="theme-light flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-500">
        <SearchX className="size-8" />
      </div>

      <p className="mt-8 text-sm font-bold tracking-[0.2em] text-brand-500 uppercase">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-900/60">
        The page you are looking for does not exist or may have been moved.
        Check the address, or head back to sign in.
      </p>

      <Button
        asChild
        className="mt-8 h-11 px-6 font-semibold shadow-[0_10px_24px_rgba(63,114,175,0.35)]"
      >
        <Link to="/login">
          <ArrowLeft />
          Back to sign in
        </Link>
      </Button>
    </main>
  )
}
