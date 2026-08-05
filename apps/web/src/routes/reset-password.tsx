import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ResetPasswordPage } from '#/features/auth/index.ts'

const resetPasswordSearchSchema = z.object({
  // Set by the backend redirect from the emailed link: a valid link arrives
  // with ?token=, an expired/used one with ?error=INVALID_TOKEN.
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  head: () => ({
    meta: [{ title: 'Reset password · EDC Management' }],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { token, error } = Route.useSearch()
  return <ResetPasswordPage token={token} error={error} />
}
