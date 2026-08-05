import { authClient } from '#/lib/auth-client.ts'
import { isLdapEmail } from '../lib/is-ldap-email.ts'
import { toAuthError } from '../lib/auth-error.ts'
import type { LoginInput } from '../schemas/login.schema.ts'

/**
 * Signs the user in against the backend, picking the flow the same way the
 * server does: LDAP domains go to POST /api/auth/sign-in/credentials, everyone
 * else to POST /api/auth/sign-in/email. On success the backend sets the
 * httpOnly session cookie; on failure this throws an `AuthError` with a
 * user-presentable message.
 */
export async function signIn(input: LoginInput): Promise<void> {
  const payload = {
    email: input.email,
    password: input.password,
    rememberMe: input.remember,
  }

  const { error } = isLdapEmail(input.email)
    ? await authClient.signIn.credentials(payload)
    : await authClient.signIn.email(payload)

  if (error) throw toAuthError(error)
}
