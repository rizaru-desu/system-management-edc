import { BadRequestException } from '@nestjs/common';
import { parseSaveRolePermissionsDto } from './save-role-permissions.dto';

const flags = { view: true, create: false, update: false, delete: false };

describe('parseSaveRolePermissionsDto', () => {
  it('accepts a well-formed matrix', () => {
    const dto = parseSaveRolePermissionsDto({
      matrix: { Operations_Specialist: { 'stock-movements': flags } },
    });
    expect(dto.matrix.Operations_Specialist['stock-movements'].view).toBe(true);
  });

  it.each([
    ['missing matrix', {}],
    ['non-object body', 'nope'],
    ['non-boolean flag', { matrix: { r: { m: { ...flags, view: 'yes' } } } }],
    ['missing flag', { matrix: { r: { m: { view: true } } } }],
    ['empty role key', { matrix: { '': { m: flags } } }],
    ['malformed key', { matrix: { 'x y!': { m: flags } } }],
  ])('rejects %s with 400', (_label, body) => {
    expect(() => parseSaveRolePermissionsDto(body)).toThrow(
      BadRequestException,
    );
  });
});
