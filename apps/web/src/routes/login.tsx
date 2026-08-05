import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { LoginPage, sessionQueryOptions } from '#/features/auth/index.ts'
import { sanitizeRedirect } from '#/features/auth/lib/sanitize-redirect.ts'

const loginSearchSchema = z.object({
  // Internal path to return to after signing in, set by the _authed guard.
  redirect: z.string().optional(),
  // Success banners: ?verified=1 after clicking the email-verification link,
  // ?reset=true after completing a password reset.
  verified: z.coerce.boolean().optional(),
  reset: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions(),
    )
    if (session) {
      throw redirect({ to: sanitizeRedirect(search.redirect, '/dashboard') })
    }
  },
  head: () => ({
    meta: [{ title: 'Sign in · EDC Management' }],
  }),
  component: LoginPage,
})
