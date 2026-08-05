import { createFileRoute, redirect } from '@tanstack/react-router'

import { ForgotPasswordPage, sessionQueryOptions } from '#/features/auth/index.ts'

export const Route = createFileRoute('/forgot-password')({
  // Signed-in users have no business here; send them to the console.
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions(),
    )
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  head: () => ({
    meta: [{ title: 'Reset password · EDC Management' }],
  }),
  component: ForgotPasswordPage,
})
