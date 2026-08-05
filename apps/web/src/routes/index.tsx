import { createFileRoute, redirect } from '@tanstack/react-router'

import { sessionQueryOptions } from '#/features/auth/index.ts'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(
      sessionQueryOptions(),
    )
    throw redirect({ to: session ? '/dashboard' : '/login' })
  },
})
