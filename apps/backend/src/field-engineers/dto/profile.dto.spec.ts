import { BadRequestException } from '@nestjs/common';
import {
  parseCreateFieldEngineerProfileDto,
  parseFieldEngineerStatusDto,
  parseUpdateFieldEngineerProfileDto,
} from './profile.dto';

describe('field engineer profile DTOs', () => {
  it('parses a full create body and defaults status to ACTIVE', () => {
    expect(
      parseCreateFieldEngineerProfileDto({
        userId: 'usr_1',
        warehouseId: 'wh_1',
        coverageRegion: '  Jakarta Selatan ',
        specializations: ['INSTALLATION', 'TROUBLESHOOTING'],
      }),
    ).toEqual({
      userId: 'usr_1',
      warehouseId: 'wh_1',
      coverageRegion: 'Jakarta Selatan',
      specializations: ['INSTALLATION', 'TROUBLESHOOTING'],
      status: 'ACTIVE',
    });
  });

  it('rejects a create body without a userId', () => {
    expect(() =>
      parseCreateFieldEngineerProfileDto({
        warehouseId: 'wh_1',
        coverageRegion: 'Jakarta',
        specializations: ['INSTALLATION'],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unknown and repeated specializations', () => {
    expect(() =>
      parseUpdateFieldEngineerProfileDto({
        warehouseId: 'wh_1',
        coverageRegion: 'Jakarta',
        specializations: ['COOKING'],
        status: 'ACTIVE',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseUpdateFieldEngineerProfileDto({
        warehouseId: 'wh_1',
        coverageRegion: 'Jakarta',
        specializations: ['INSTALLATION', 'INSTALLATION'],
        status: 'ACTIVE',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects an empty specializations list', () => {
    expect(() =>
      parseUpdateFieldEngineerProfileDto({
        warehouseId: 'wh_1',
        coverageRegion: 'Jakarta',
        specializations: [],
        status: 'ON_LEAVE',
      }),
    ).toThrow(BadRequestException);
  });

  it('parses the quick status change and rejects unknown statuses', () => {
    expect(parseFieldEngineerStatusDto({ status: 'ON_LEAVE' })).toEqual({
      status: 'ON_LEAVE',
    });
    expect(() => parseFieldEngineerStatusDto({ status: 'RETIRED' })).toThrow(
      BadRequestException,
    );
  });
});
