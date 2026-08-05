import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let mockMailerService: jest.Mocked<Partial<MailerService>>;

  beforeEach(async () => {
    mockMailerService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendResetPasswordEmail', () => {
    it('should call mailer.sendMail with correct reset password parameters', async () => {
      const recipient = 'user@example.com';
      const name = 'John Doe';
      const resetUrl = 'https://example.com/reset-password?token=abc123xyz';

      await service.sendResetPasswordEmail(recipient, name, resetUrl);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: recipient,
        subject: 'Atur ulang password Anda · EDC Management',
        template: 'reset-password',
        context: { name, url: resetUrl },
      });
    });

    it('should catch errors and log them without rethrowing', async () => {
      mockMailerService.sendMail?.mockRejectedValueOnce(
        new Error('SMTP Connection failed'),
      );

      await expect(
        service.sendResetPasswordEmail(
          'user@example.com',
          'John Doe',
          'https://example.com',
        ),
      ).resolves.not.toThrow();
    });
  });
});
