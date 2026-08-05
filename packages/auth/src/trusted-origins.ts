import os from "node:os";

export interface TrustedOriginsOptions {
  /**
   * Raw origins string (e.g. from TRUSTED_ORIGINS env var) or parsed array.
   */
  envOrigins?: string | string[] | null;
  /**
   * Environment name (e.g. 'development', 'production', 'test').
   * Defaults to process.env.NODE_ENV or 'development'.
   */
  nodeEnv?: string;
  /**
   * Origin or URL of the Web Application (e.g. process.env.WEB_APP_URL).
   */
  webAppUrl?: string | null;
  /**
   * Origin or URL of the Better Auth server (e.g. process.env.BETTER_AUTH_URL).
   */
  betterAuthUrl?: string | null;
  /**
   * Custom development ports to automatically whitelist for local IPs & localhost.
   * Defaults to [3000, 3001, 5173, 8081].
   */
  devPorts?: readonly number[] | number[];
}

/**
 * Standard development ports used across Web (Vite: 5173, Next: 3000),
 * Backend API (NestJS: 3001), and Mobile (Metro/Expo: 8081).
 */
export const DEFAULT_DEV_PORTS: readonly number[] = [3000, 3001, 5173, 8081] as const;

/**
 * Wildcard origin patterns enabled in development environments.
 */
export const DEV_WILDCARD_ORIGINS: readonly string[] = [
  "http://localhost:*",
  "http://127.0.0.1:*",
  "exp://localhost:*",
  "exp://127.0.0.1:*",
  "exp://*",
  "exp://**",
  "myapp://*",
] as const;

/**
 * Android emulator host loopback address (maps to the host machine 127.0.0.1).
 */
export const ANDROID_EMULATOR_HOST = "10.0.2.2";

/**
 * Retrieves all active non-internal IPv4 LAN addresses from the host machine using `os.networkInterfaces()`.
 */
export function getLocalIpAddresses(): string[] {
  const ips = new Set<string>();

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;

      for (const net of netList) {
        // Support both string "IPv4" and numerical 4 (Node 18+)
        const isIpv4 = net.family === "IPv4" || (net as unknown as { family: number }).family === 4;
        if (isIpv4 && !net.internal && net.address) {
          // Exclude link-local auto-configuration addresses (169.254.x.x)
          if (!net.address.startsWith("169.254.")) {
            ips.add(net.address);
          }
        }
      }
    }
  } catch {
    // Gracefully handle environments where os.networkInterfaces() is restricted
  }

  return Array.from(ips);
}

/**
 * Parses raw comma-separated origin string or string array into a trimmed,
 * non-empty, deduplicated string array.
 */
export function parseOrigins(rawOrigins?: string | string[] | null): string[] {
  if (!rawOrigins) return [];

  const list = Array.isArray(rawOrigins)
    ? rawOrigins
    : rawOrigins.split(",");

  const seen = new Set<string>();
  for (const item of list) {
    const trimmed = item.trim().replace(/\/+$/, "");
    if (trimmed.length > 0) {
      seen.add(trimmed);
    }
  }

  return Array.from(seen);
}

/**
 * Extracts origin from a URL string (e.g. "http://localhost:5173/dashboard" -> "http://localhost:5173").
 */
export function getOriginFromUrl(urlString?: string | null): string | null {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    return url.origin;
  } catch {
    const trimmed = urlString.trim().replace(/\/+$/, "");
    return trimmed || null;
  }
}

/**
 * Resolves the complete list of trusted origins for Better Auth and CORS.
 *
 * Rules:
 * 1. Parses origins from `TRUSTED_ORIGINS` (from options or process.env), trimming whitespace,
 *    filtering out empty entries, and removing duplicates.
 * 2. Adds `WEB_APP_URL` and `BETTER_AUTH_URL` origins.
 * 3. In Production (`NODE_ENV === 'production'`):
 *    - Auto-detection is disabled; only explicitly configured origins are returned.
 * 4. In Development (`NODE_ENV !== 'production'`):
 *    - Automatically detects host LAN IPv4 address(es) via `os.networkInterfaces()`.
 *    - Automatically appends:
 *      - http://<local-ip>:3000
 *      - http://<local-ip>:3001
 *      - http://<local-ip>:5173
 *      - http://<local-ip>:8081
 *      - exp://<local-ip>:8081
 *    - Always allows:
 *      - http://localhost:*
 *      - http://127.0.0.1:*
 *      - exp://localhost:*
 *      - exp://127.0.0.1:*
 *    - Appends Android emulator (10.0.2.2) and explicit localhost/127.0.0.1 dev ports.
 */
export function resolveTrustedOrigins(options: TrustedOriginsOptions = {}): string[] {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";

  const origins = new Set<string>();

  // 1. Configured TRUSTED_ORIGINS from options or process.env
  const envRaw = options.envOrigins !== undefined ? options.envOrigins : process.env.TRUSTED_ORIGINS;
  for (const origin of parseOrigins(envRaw)) {
    origins.add(origin);
  }

  // 2. Add WEB_APP_URL origin
  const webAppOrigin = getOriginFromUrl(
    options.webAppUrl !== undefined ? options.webAppUrl : process.env.WEB_APP_URL,
  );
  if (webAppOrigin) {
    origins.add(webAppOrigin);
  }

  // 3. Add BETTER_AUTH_URL origin
  const authOrigin = getOriginFromUrl(
    options.betterAuthUrl !== undefined ? options.betterAuthUrl : process.env.BETTER_AUTH_URL,
  );
  if (authOrigin) {
    origins.add(authOrigin);
  }

  // In production, strictly use only defined origins
  if (isProduction) {
    return Array.from(origins);
  }

  // ─── Development Mode Auto-Detection & Whitelisting ────────────────────────
  const ports = options.devPorts ?? DEFAULT_DEV_PORTS;

  // Wildcard patterns for Better Auth & dynamic origin checking
  for (const wildcard of DEV_WILDCARD_ORIGINS) {
    origins.add(wildcard);
  }

  // Standard local hosts (localhost, 127.0.0.1, Android emulator 10.0.2.2)
  const devHosts = ["localhost", "127.0.0.1", ANDROID_EMULATOR_HOST];
  for (const host of devHosts) {
    for (const port of ports) {
      origins.add(`http://${host}:${port}`);
    }
    origins.add(`exp://${host}:8081`);
  }

  // Auto-detect LAN IPv4s and add dev URLs
  const localIps = getLocalIpAddresses();
  for (const ip of localIps) {
    for (const port of ports) {
      origins.add(`http://${ip}:${port}`);
    }
    origins.add(`exp://${ip}:8081`);
  }

  return Array.from(origins);
}

/**
 * Checks whether an incoming request origin matches any trusted origin (including wildcards).
 * Requests without an Origin header (e.g. mobile native app HTTP client, Postman, curl) are allowed.
 */
export function isOriginAllowed(
  origin: string | undefined | null,
  trustedOrigins: readonly string[] | string[],
): boolean {
  // Non-browser or direct server/mobile requests do not include an Origin header
  if (!origin) return true;

  const normalizedOrigin = origin.trim().replace(/\/+$/, "");

  for (const trusted of trustedOrigins) {
    const pattern = trusted.trim().replace(/\/+$/, "");

    // Exact match
    if (pattern === normalizedOrigin) {
      return true;
    }

    // Wildcard port matching: e.g. "http://localhost:*" or "exp://localhost:*"
    if (pattern.endsWith(":*")) {
      const prefix = pattern.slice(0, -1); // e.g. "http://localhost:"
      if (normalizedOrigin.startsWith(prefix)) {
        const portPart = normalizedOrigin.slice(prefix.length);
        if (/^\d+$/.test(portPart)) {
          return true;
        }
      }
    }

    // General wildcard matching: e.g. "https://*.example.com" or "exp://*.8081"
    if (pattern.includes("*")) {
      const escapedPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      const regex = new RegExp(`^${escapedPattern}$`, "i");
      if (regex.test(normalizedOrigin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns a CORS origin delegate callback function compatible with Express & NestJS `app.enableCors()`.
 */
export function getCorsOriginDelegate(
  trustedOrigins: readonly string[] | string[],
): (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void {
  return (origin, callback) => {
    if (isOriginAllowed(origin, trustedOrigins)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: Origin ${origin} is not allowed by trusted origins.`));
    }
  };
}
