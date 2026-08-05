/**
 * Bridge between the Better Auth instance and the host app's mail transport.
 *
 * `auth.ts` must send verification / password-reset emails, but the SMTP
 * transport and templates live in the NestJS backend (MailModule). The host
 * registers its sender here during bootstrap; until then auth flows log a
 * warning and drop the email instead of failing, so a missing mailer never
 * blocks sign-in or user creation.
 */

/** One outgoing auth email: recipient plus the fully-built action link. */
export interface AuthMailMessage {
  to: string;
  name: string;
  url: string;
}

export interface AuthMailer {
  sendVerificationEmail(message: AuthMailMessage): Promise<void>;
  sendResetPasswordEmail(message: AuthMailMessage): Promise<void>;
}

let registered: AuthMailer | null = null;

/** Called once by the host app (backend MailModule) during bootstrap. */
export function registerAuthMailer(mailer: AuthMailer): void {
  registered = mailer;
}

export function getAuthMailer(): AuthMailer | null {
  if (!registered) {
    console.warn(
      "[auth] No auth mailer registered — dropping outgoing auth email.",
    );
  }
  return registered;
}
