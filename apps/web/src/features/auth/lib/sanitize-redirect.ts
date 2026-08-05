/**
 * Restricts a post-login redirect target to an internal path so the
 * `?redirect=` search param cannot be abused for open redirects
 * (`https://evil.example` or protocol-relative `//evil.example`).
 */
export function sanitizeRedirect(
  target: string | undefined,
  fallback: string,
): string {
  if (!target) return fallback
  if (!target.startsWith('/') || target.startsWith('//')) return fallback
  return target
}
