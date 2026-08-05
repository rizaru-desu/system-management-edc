/** Cutoffs for `formatRelativeTime`, largest unit that fits wins. */
const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> =
  [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
  ]

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/**
 * "3 days ago"-style label for the users table. Anything under a minute is
 * "just now"; clock skew (timestamps slightly in the future) is clamped there
 * too rather than rendering "in 20 seconds".
 */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const elapsed = now - new Date(iso).getTime()
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (elapsed >= ms) {
      return relativeFormat.format(-Math.floor(elapsed / ms), unit)
    }
  }
  return 'just now'
}

const BROWSERS: Array<{ pattern: RegExp; label: string }> = [
  // Order matters: Edge/Opera UAs also contain "Chrome", Chrome contains
  // "Safari".
  { pattern: /Edg(?:e|A|iOS)?\//, label: 'Edge' },
  { pattern: /OPR\/|Opera/, label: 'Opera' },
  { pattern: /Chrome\/|CriOS\//, label: 'Chrome' },
  { pattern: /Firefox\/|FxiOS\//, label: 'Firefox' },
  { pattern: /Safari\//, label: 'Safari' },
]

const SYSTEMS: Array<{ pattern: RegExp; label: string }> = [
  // iOS/Android before the desktop patterns their UAs also mention.
  { pattern: /iPhone|iPad|iPod/, label: 'iOS' },
  { pattern: /Android/, label: 'Android' },
  { pattern: /Windows/, label: 'Windows' },
  { pattern: /Mac OS X|Macintosh/, label: 'macOS' },
  { pattern: /Linux/, label: 'Linux' },
]

/**
 * Compresses a raw user-agent string into a short "Chrome · Windows" label
 * for the users table; null when nothing recognizable (the caller falls back
 * to omitting the line).
 */
export function describeUserAgent(userAgent: string): string | null {
  const browser = BROWSERS.find(({ pattern }) => pattern.test(userAgent))?.label
  const system = SYSTEMS.find(({ pattern }) => pattern.test(userAgent))?.label
  if (browser && system) return `${browser} · ${system}`
  return browser ?? system ?? null
}
