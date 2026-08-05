import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { authClient } from '#/lib/auth-client.ts'
import type { Session } from '#/lib/auth-client.ts'

/**
 * Resolves the current session on the Start server by forwarding the incoming
 * request's cookies to the backend. Session cookies are httpOnly, so during
 * SSR the browser's fetch credentials are unavailable — this is the only way
 * route guards can see the session on first load without flashing /login.
 * Client-side calls go through the same RPC, keeping one code path.
 */
const fetchSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Session | null> => {
    const cookie = getRequestHeader('cookie')
    if (!cookie) return null

    const { data } = await authClient.getSession({
      fetchOptions: { headers: { cookie } },
    })
    // A backend error (network, 5xx) is treated as "no session": guards then
    // redirect to /login, where a sign-in attempt surfaces the real error.
    return data
  },
)

export const sessionQueryKey = ['auth', 'session'] as const

/**
 * The canonical session query. Route guards resolve it via
 * `queryClient.ensureQueryData`, components via `useQuery`/`useSuspenseQuery`.
 * Sign-in/out remove it from the cache so the next guard run refetches.
 */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: sessionQueryKey,
    queryFn: () => fetchSession(),
    // Guards run on every navigation; don't refetch more than needed.
    staleTime: 30_000,
  })
