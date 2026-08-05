import { BadRequestException } from '@nestjs/common';
import { parseUpdateUserDto } from './update-user.dto';

const valid = {
  name: 'Rina Kartika',
  email: 'rina@edc.co.id',
  roles: ['Operations_Specialist', 'Contract_Manager'],
  banned: false,
};

describe('parseUpdateUserDto', () => {
  it('accepts a well-formed body and normalizes name/email', () => {
    const dto = parseUpdateUserDto({
      ...valid,
      name: '  Rina Kartika ',
      email: ' Rina@EDC.co.id ',
    });
    expect(dto.name).toBe('Rina Kartika');
    expect(dto.email).toBe('rina@edc.co.id');
    expect(dto.roles).toEqual(['Operations_Specialist', 'Contract_Manager']);
  });

  it('de-duplicates repeated roles', () => {
    const dto = parseUpdateUserDto({
      ...valid,
      roles: ['Operations_Specialist', 'Operations_Specialist'],
    });
    expect(dto.roles).toEqual(['Operations_Specialist']);
  });

  it('accepts System_Administrator on its own', () => {
    const dto = parseUpdateUserDto({
      ...valid,
      roles: ['System_Administrator'],
    });
    expect(dto.roles).toEqual(['System_Administrator']);
  });

  it('accepts empty roles when the account is being deactivated', () => {
    const dto = parseUpdateUserDto({ ...valid, roles: [], banned: true });
    expect(dto.roles).toEqual([]);
  });

  it('defaults a missing banReason to null', () => {
    expect(parseUpdateUserDto(valid).banReason).toBeNull();
  });

  it('normalizes a blank banReason to null and trims a real one', () => {
    expect(
      parseUpdateUserDto({ ...valid, banReason: '   ' }).banReason,
    ).toBeNull();
    expect(
      parseUpdateUserDto({ ...valid, banReason: ' Resigned ' }).banReason,
    ).toBe('Resigned');
  });

  it.each([
    ['non-object body', 'nope'],
    ['missing name', { ...valid, name: undefined }],
    ['blank name', { ...valid, name: '   ' }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['empty roles while active', { ...valid, roles: [] }],
    ['malformed role key', { ...valid, roles: ['x y!'] }],
    ['role key with comma', { ...valid, roles: ['a,b'] }],
    [
      'System_Administrator mixed with another role',
      { ...valid, roles: ['System_Administrator', 'Contract_Manager'] },
    ],
    ['non-boolean banned', { ...valid, banned: 'yes' }],
    ['overlong banReason', { ...valid, banReason: 'x'.repeat(501) }],
  ])('rejects %s with 400', (_label, body) => {
    expect(() => parseUpdateUserDto(body)).toThrow(BadRequestException);
  });
});
