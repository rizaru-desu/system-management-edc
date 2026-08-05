import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Default backend API port
 */
export const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3001';

/**
 * Android emulator loopback IP mapping to the host machine
 */
export const ANDROID_EMULATOR_HOST = '10.0.2.2';

/**
 * Default localhost host
 */
export const LOCALHOST = 'localhost';

/**
 * Extracts the Metro bundler host IP / hostname from expo-constants at runtime.
 * Works across Expo Go, Expo Dev Client, and bare React Native with Expo modules.
 */
export function getMetroHost(): string | null {
  try {
    // 1. Modern Expo SDK standard location (SDK 49 - 57+)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.replace(/^[a-zA-Z]+:\/\//, '').split(':')[0]?.split('/')[0];
      if (host) return host.trim();
    }

    // 2. Expo Go / Development client debuggerHost fallbacks
    const expoGoConfig = (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig;
    if (expoGoConfig?.debuggerHost && typeof expoGoConfig.debuggerHost === 'string') {
      const host = expoGoConfig.debuggerHost.replace(/^[a-zA-Z]+:\/\//, '').split(':')[0]?.split('/')[0];
      if (host) return host.trim();
    }

    // 3. Manifest v2 extra fields (EAS Update / Dev Client)
    const manifest2 = (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string }; expoClient?: { hostUri?: string } } } }).manifest2;
    const manifest2Host = manifest2?.extra?.expoGo?.debuggerHost || manifest2?.extra?.expoClient?.hostUri;
    if (manifest2Host && typeof manifest2Host === 'string') {
      const host = manifest2Host.replace(/^[a-zA-Z]+:\/\//, '').split(':')[0]?.split('/')[0];
      if (host) return host.trim();
    }

    // 4. Legacy manifest debuggerHost fallback
    const legacyManifest = (Constants as { manifest?: { debuggerHost?: string } }).manifest;
    if (legacyManifest?.debuggerHost && typeof legacyManifest.debuggerHost === 'string') {
      const host = legacyManifest.debuggerHost.replace(/^[a-zA-Z]+:\/\//, '').split(':')[0]?.split('/')[0];
      if (host) return host.trim();
    }

    // 5. Experience / linking URI fallback (e.g. exp://192.168.1.X:8081)
    const experienceUrl =
      (Constants as { experienceUrl?: string; linkingUri?: string }).experienceUrl ||
      (Constants as { experienceUrl?: string; linkingUri?: string }).linkingUri;
    if (experienceUrl && typeof experienceUrl === 'string') {
      const match = experienceUrl.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[API Config] Failed to detect Metro host from Constants:', error);
    }
  }

  return null;
}

/**
 * Resolves the API Base URL dynamically based on environment and platform:
 *
 * 1. Production Mode:
 *    Always uses `EXPO_PUBLIC_API_URL` (stripping trailing slash).
 *
 * 2. Development Mode:
 *    - Auto-detects Metro host IP at runtime via `expo-constants`.
 *    - For physical devices: resolves to `http://<metro-lan-ip>:3001`.
 *    - For Android emulator: maps localhost/127.0.0.1 to `http://10.0.2.2:3001` or uses detected LAN IP.
 *    - For iOS simulator: resolves to `http://localhost:3001` or detected LAN IP.
 *    - If detection fails: falls back to `EXPO_PUBLIC_API_URL` or platform default.
 */
export function getApiBaseUrl(): string {
  // In production builds, strictly use the configured environment variable
  if (!__DEV__ || process.env.NODE_ENV === 'production') {
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
    if (envUrl) {
      return envUrl;
    }
    // Fallback if env variable is missing in production
    return Platform.OS === 'android'
      ? `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_API_PORT}`
      : `http://${LOCALHOST}:${DEFAULT_API_PORT}`;
  }

  // Development Mode: Try auto-detecting Metro host
  const metroHost = getMetroHost();

  if (metroHost) {
    // If Metro is bound to localhost or 127.0.0.1
    if (metroHost === 'localhost' || metroHost === '127.0.0.1') {
      if (Platform.OS === 'android') {
        return `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_API_PORT}`;
      }
      return `http://${LOCALHOST}:${DEFAULT_API_PORT}`;
    }

    // Physical device or emulator connected via LAN IP (e.g. 192.168.1.X)
    return `http://${metroHost}:${DEFAULT_API_PORT}`;
  }

  // Fallback 1: Use EXPO_PUBLIC_API_URL if defined in .env
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (envUrl) {
    return envUrl;
  }

  // Fallback 2: Platform-specific default fallback
  return Platform.OS === 'android'
    ? `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_API_PORT}`
    : `http://${LOCALHOST}:${DEFAULT_API_PORT}`;
}

/**
 * Resolved API Base URL constant for singleton and client initialization.
 */
export const API_BASE_URL: string = getApiBaseUrl();

/**
 * Resolves the client Origin header to send with HTTP requests (e.g. for Better Auth CSRF validation).
 */
export function getAppOrigin(): string {
  const metroHost = getMetroHost();
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `exp://${metroHost}:8081`;
  }
  return Platform.OS === 'android'
    ? `http://${ANDROID_EMULATOR_HOST}:8081`
    : `exp://localhost:8081`;
}

// Log resolved URL once in development for easy debugging
if (__DEV__) {
  console.log(`[API Config] Base URL initialized: ${API_BASE_URL} (Platform: ${Platform.OS}, Metro Host: ${getMetroHost() || 'none'})`);
}

/**
 * Centralized API endpoints
 */
export const API_ENDPOINTS = {
  CHECK_UPDATE:
    process.env.EXPO_PUBLIC_CHECK_UPDATE_ENDPOINT?.replace(/^\/+/, '') ||
    'api/mobile/version',
  AUTH_SIGN_IN_EMAIL: 'api/auth/sign-in/email',
  AUTH_SIGN_IN_CREDENTIALS: 'api/auth/sign-in/credentials',
  AUTH_GET_SESSION: 'api/auth/get-session',
  AUTH_SIGN_OUT: 'api/auth/sign-out',
  DEVICE_REGISTER: 'api/mobile/device/register',
  DEVICE_LOGOUT: 'api/mobile/device/logout',
} as const;

/**
 * Centralized Axios / HTTP Client Configuration
 */
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
} as const;

export default API_BASE_URL;
