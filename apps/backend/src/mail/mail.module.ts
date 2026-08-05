import { join } from 'path';
import { Module, OnModuleInit } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { registerAuthMailer } from '@repo/auth';
import { mailEnv } from './mail.env';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: mailEnv.SMTP_HOST,
        port: mailEnv.SMTP_PORT,
        secure: mailEnv.SMTP_SECURE,
        // Servers without auth (local catchers, open relays) reject AUTH probes.
        auth: mailEnv.SMTP_USER
          ? { user: mailEnv.SMTP_USER, pass: mailEnv.SMTP_PASS }
          : undefined,
      },
      defaults: {
        from: mailEnv.MAIL_FROM,
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule implements OnModuleInit {
  constructor(private readonly mailService: MailService) {}

  // Hand the Better Auth instance (created in @repo/auth, outside Nest's DI)
  // its mail transport before the first request can hit /api/auth/*.
  onModuleInit(): void {
    registerAuthMailer({
      sendVerificationEmail: ({ to, name, url }) =>
        this.mailService.sendVerificationEmail(to, name, url),
      sendResetPasswordEmail: ({ to, name, url }) =>
        this.mailService.sendResetPasswordEmail(to, name, url),
    });
  }
}
