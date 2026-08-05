import { authClient } from '#/lib/auth-client.ts'
import { toAuthError } from '../lib/auth-error.ts'

/**
 * Emails a password-reset link for non-AD accounts. The backend answers with
 * a generic success whether or not the email exists (no account enumeration),
 * and silently skips AD/LDAP addresses — their passwords live in the
 * directory.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw toAuthError(error)
}

/** Exchanges the token from the emailed link for a new password. */
export async function resetPassword(input: {
  newPassword: string
  token: string
}): Promise<void> {
  const { error } = await authClient.resetPassword(input)
  if (error) throw toAuthError(error)
}
