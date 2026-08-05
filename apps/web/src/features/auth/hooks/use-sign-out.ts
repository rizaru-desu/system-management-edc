import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { sessionQueryKey } from '../api/session.ts'
import { signOut } from '../api/sign-out.ts'

/**
 * Sign-out mutation. Runs in `onSettled` so that even if the server call
 * fails, the local session cache is cleared and the user lands on /login —
 * never stuck "half signed out".
 */
export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSettled: async () => {
      queryClient.removeQueries({ queryKey: sessionQueryKey })
      await router.invalidate()
      await router.navigate({ to: '/login' })
    },
  })
}
