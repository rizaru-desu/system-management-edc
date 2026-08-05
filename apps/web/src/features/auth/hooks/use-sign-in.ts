import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearch } from '@tanstack/react-router'

import { signIn } from '../api/sign-in.ts'
import { sessionQueryKey } from '../api/session.ts'
import { sanitizeRedirect } from '../lib/sanitize-redirect.ts'

/**
 * Sign-in mutation. On success it drops the cached session, re-runs route
 * guards, and navigates to the `?redirect=` target (internal paths only) or
 * the dashboard. Failures stay on the mutation as `AuthError` for the form
 * to render.
 */
export function useSignIn() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = useSearch({ strict: false })

  return useMutation({
    mutationFn: signIn,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: sessionQueryKey })
      await router.invalidate()
      await router.navigate({
        to: sanitizeRedirect(search.redirect, '/dashboard'),
      })
    },
  })
}
