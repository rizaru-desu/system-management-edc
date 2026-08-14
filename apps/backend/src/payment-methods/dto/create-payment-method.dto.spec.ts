import { BadRequestException } from '@nestjs/common';
import { parseCreatePaymentMethodDto } from './create-payment-method.dto';
import { parseUpdatePaymentMethodDto } from './update-payment-method.dto';

describe('parseCreatePaymentMethodDto', () => {
  it('trims text, nulls the blanks and defaults the status', () => {
    const dto = parseCreatePaymentMethodDto({
      name: '  QRIS  ',
      code: '   ',
      description: '',
    });

    expect(dto).toEqual({
      name: 'QRIS',
      code: null,
      description: null,
      status: 'ACTIVE',
    });
  });

  it('keeps a provided code and status', () => {
    const dto = parseCreatePaymentMethodDto({
      name: 'Credit Card',
      code: ' PAY-002 ',
      status: 'INACTIVE',
    });

    expect(dto.code).toBe('PAY-002');
    expect(dto.status).toBe('INACTIVE');
  });

  it('rejects a missing name and an unknown status', () => {
    expect(() => parseCreatePaymentMethodDto({ name: '   ' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseCreatePaymentMethodDto({ name: 'QRIS', status: 'PAUSED' }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdatePaymentMethodDto', () => {
  it('accepts a partial body without injecting defaults', () => {
    const dto = parseUpdatePaymentMethodDto({ name: 'E-Wallet' });

    expect(dto).toEqual({ name: 'E-Wallet' });
    // No status default on PATCH — it would silently force ACTIVE.
    expect(dto).not.toHaveProperty('status');
  });

  it('rejects an empty body', () => {
    expect(() => parseUpdatePaymentMethodDto({})).toThrow(BadRequestException);
  });
});
