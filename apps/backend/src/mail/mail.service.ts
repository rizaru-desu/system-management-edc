import { Injectable, Logger } from '@nestjs/common';
import { MailerService, ISendMailOptions } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  /** Generic passthrough for one-off emails (html/text/template). */
  async send(options: ISendMailOptions): Promise<void> {
    await this.mailer.sendMail(options);
  }

  /** Example templated email — renders templates/welcome.hbs. */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: 'Selamat datang di System Management EDC',
        template: 'welcome',
        context: { name },
      });
    } catch (error) {
      // Email is best-effort: log instead of failing the calling request.
      this.logger.error(`Failed to send welcome email to ${to}`, error);
    }
  }

  /** Account-activation link for non-AD users — templates/verify-email.hbs. */
  async sendVerificationEmail(
    to: string,
    name: string,
    url: string,
  ): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: 'Verifikasi email Anda · EDC Management',
        template: 'verify-email',
        context: { name, url },
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
  }

  /** Password-reset link for non-AD users — templates/reset-password.hbs. */
  async sendResetPasswordEmail(
    to: string,
    name: string,
    url: string,
  ): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: 'Atur ulang password Anda · EDC Management',
        template: 'reset-password',
        context: { name, url },
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }
}
