import { BadRequestException } from '@nestjs/common';
import { parseListUsersDto } from './list-users.dto';

describe('parseListUsersDto', () => {
  it('accepts a full filter body', () => {
    const dto = parseListUsersDto({
      search: 'rina',
      role: 'Operations_Specialist',
      page: 2,
      pageSize: 25,
    });
    expect(dto).toEqual({
      search: 'rina',
      role: 'Operations_Specialist',
      page: 2,
      pageSize: 25,
    });
  });

  it('treats a missing body as "no filters"', () => {
    expect(parseListUsersDto(undefined)).toEqual({});
    expect(parseListUsersDto({})).toEqual({});
  });

  it('rejects non-numeric pagination', () => {
    expect(() => parseListUsersDto({ page: '2' })).toThrow(BadRequestException);
  });

  it('rejects zero or negative page numbers', () => {
    expect(() => parseListUsersDto({ page: 0 })).toThrow(BadRequestException);
    expect(() => parseListUsersDto({ pageSize: -5 })).toThrow(
      BadRequestException,
    );
  });
});
