/**
 * Compares two semantic version strings (e.g., "1.0.0", "1.2.3").
 * Returns:
 *   -1 if v1 < v2
 *    0 if v1 === v2
 *    1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (!v1 || !v2) return 0;

  const cleanV1 = v1.trim().replace(/^v/i, '');
  const cleanV2 = v2.trim().replace(/^v/i, '');

  const parts1 = cleanV1
    .split('.')
    .map((p) => parseInt(p.split('-')[0] ?? '0', 10) || 0);
  const parts2 = cleanV2
    .split('.')
    .map((p) => parseInt(p.split('-')[0] ?? '0', 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
}
