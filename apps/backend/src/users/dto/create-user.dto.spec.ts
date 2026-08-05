import { BadRequestException } from '@nestjs/common';
import { parseCreateUserDto } from './create-user.dto';

const valid = {
  name: 'Rina Kartika',
  email: 'rina@edc.co.id',
  roles: ['Operations_Specialist'],
  password: 'correct-horse-battery',
  banned: false,
};

describe('parseCreateUserDto', () => {
  it('accepts a well-formed body and normalizes name/email', () => {
    const dto = parseCreateUserDto({
      ...valid,
      name: '  Rina Kartika ',
      email: ' Rina@EDC.co.id ',
    });
    expect(dto.name).toBe('Rina Kartika');
    expect(dto.email).toBe('rina@edc.co.id');
    expect(dto.password).toBe('correct-horse-battery');
  });

  it('keeps the password verbatim (no trimming)', () => {
    const dto = parseCreateUserDto({ ...valid, password: '  spaced pw  ' });
    expect(dto.password).toBe('  spaced pw  ');
  });

  it('accepts a deactivated account as long as it has a role', () => {
    const dto = parseCreateUserDto({
      ...valid,
      banned: true,
      banReason: ' Pending onboarding ',
    });
    expect(dto.banned).toBe(true);
    expect(dto.banReason).toBe('Pending onboarding');
  });

  it.each([
    ['non-object body', 'nope'],
    ['missing password', { ...valid, password: undefined }],
    ['short password', { ...valid, password: 'seven77' }],
    ['overlong password', { ...valid, password: 'x'.repeat(129) }],
    ['empty roles while active', { ...valid, roles: [] }],
    ['empty roles even while banned', { ...valid, roles: [], banned: true }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    [
      'System_Administrator mixed with another role',
      { ...valid, roles: ['System_Administrator', 'Contract_Manager'] },
    ],
  ])('rejects %s with 400', (_label, body) => {
    expect(() => parseCreateUserDto(body)).toThrow(BadRequestException);
  });
});
