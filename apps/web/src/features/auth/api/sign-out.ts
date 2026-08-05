import { authClient } from '#/lib/auth-client.ts'
import { toAuthError } from '../lib/auth-error.ts'

/**
 * Revokes the current session on the backend and clears the session cookie.
 * Throws an `AuthError` if the server rejects the request.
 */
export async function signOut(): Promise<void> {
  const { error } = await authClient.signOut()
  if (error) throw toAuthError(error)
}
