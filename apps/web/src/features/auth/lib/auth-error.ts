/** Error thrown by the auth API layer with a user-presentable message. */
export class AuthError extends Error {
  readonly code?: string
  readonly status?: number

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message)
    this.name = 'AuthError'
    this.code = options?.code
    this.status = options?.status
  }
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Incorrect email or password.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  USER_NOT_FOUND: 'Incorrect email or password.',
  EMAIL_NOT_VERIFIED:
    "Your email hasn't been verified yet. We've sent you a new verification link — check your inbox.",
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
  INVALID_TOKEN: 'This link is invalid or has expired. Request a new one.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
}

/**
 * Converts a Better Auth client error (`{ code?, message?, status }`) into an
 * `AuthError` with a message safe to show in the UI. Unknown codes fall back
 * to a generic message so raw server errors never leak into the form.
 */
export function toAuthError(error: {
  code?: string | undefined
  message?: string | undefined
  status: number
  statusText: string
}): AuthError {
  const known = error.code ? MESSAGES[error.code] : undefined
  const fallback =
    error.status >= 500 || error.status === 0
      ? 'Something went wrong on our end. Please try again later.'
      : 'Incorrect email or password.'

  return new AuthError(known ?? fallback, {
    code: error.code,
    status: error.status,
  })
}

/** Message for failures that never reached the server (network down, CORS). */
export const NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Check your connection and try again.'

/** Extracts a user-presentable message from an unknown thrown value. */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) return error.message
  return NETWORK_ERROR_MESSAGE
}
