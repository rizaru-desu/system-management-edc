import { apiClient, ApiError } from './api-client';
import { API_ENDPOINTS } from '@/config/api';
import { deviceService } from './device.service';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSessionResponse {
  user: User;
  session: Session;
  token?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

const DEFAULT_LDAP_DOMAINS = ['ldap.forumsys.com'];

export function isLdapEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  const configured = process.env.EXPO_PUBLIC_LDAP_EMAIL_DOMAINS
    ? process.env.EXPO_PUBLIC_LDAP_EMAIL_DOMAINS.split(',').map((d) => d.trim().toLowerCase())
    : DEFAULT_LDAP_DOMAINS;
  return configured.includes(domain);
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Incorrect email or password.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  USER_NOT_FOUND: 'Account not found. Please check your email.',
  EMAIL_NOT_VERIFIED:
    "Your email has not been verified yet. Please check your inbox for a verification link.",
  TOO_MANY_REQUESTS: 'Too many failed attempts. Please try again in a few minutes.',
  USER_BANNED: 'Your account has been deactivated. Please contact support.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
};

class AuthService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  /**
   * Sign in using Better Auth endpoints.
   * Routes to LDAP credentials plugin or standard email flow based on email domain.
   * Session cookies are automatically passed/stored by Axios with withCredentials: true.
   */
  public async signIn(payload: LoginPayload): Promise<AuthSessionResponse> {
    const endpoint = isLdapEmail(payload.email)
      ? API_ENDPOINTS.AUTH_SIGN_IN_CREDENTIALS
      : API_ENDPOINTS.AUTH_SIGN_IN_EMAIL;

    const response = await apiClient.post<AuthSessionResponse>(endpoint, {
      email: payload.email.trim(),
      password: payload.password,
      rememberMe: payload.rememberMe ?? true,
    });

    this.currentUser = response.data.user;
    this.currentSession = response.data.session;

    // Register device in the background without blocking login
    deviceService.registerDevice();

    return response.data;
  }

  /**
   * Check active Better Auth session.
   */
  public async getSession(): Promise<AuthSessionResponse | null> {
    try {
      const response = await apiClient.get<AuthSessionResponse | null>(
        API_ENDPOINTS.AUTH_GET_SESSION,
      );
      if (response.data?.user && response.data?.session) {
        this.currentUser = response.data.user;
        this.currentSession = response.data.session;
        return response.data;
      }
      this.currentUser = null;
      this.currentSession = null;
      return null;
    } catch {
      this.currentUser = null;
      this.currentSession = null;
      return null;
    }
  }

  /**
   * Sign out and terminate Better Auth session.
   */
  public async signOut(): Promise<void> {
    try {
      // Logout device in the background before clearing session
      await deviceService.logoutDevice();
      
      await apiClient.post(API_ENDPOINTS.AUTH_SIGN_OUT, {});
    } finally {
      this.currentUser = null;
      this.currentSession = null;
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Formats API / network errors into user-friendly messages.
   */
  public getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      const code = error.data?.code as string | undefined;
      if (code && ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
      }
      if (error.data?.message && typeof error.data.message === 'string') {
        return error.data.message;
      }
      if (error.status === 401 || error.status === 403) {
        return 'Incorrect email or password.';
      }
      if (error.status >= 500) {
        return 'Server error occurred. Please try again later.';
      }
      return error.message || 'Login failed. Please check your credentials.';
    }

    if (error instanceof Error) {
      if (error.message.includes('Network Error') || error.message.includes('timeout')) {
        return 'Unable to connect to the server. Please check your network connection.';
      }
      return error.message;
    }

    return 'An unexpected error occurred during login. Please try again.';
  }
}

export const authService = new AuthService();
export default authService;
