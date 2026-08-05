import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as dbModule from '@repo/db';
import { MobileService } from './mobile.service';
import { OtaUpdateStrategyService } from './strategies/ota-update.strategy';
import { ApkUpdateStrategyService } from './strategies/apk-update.strategy';

jest.mock('@repo/db', () => ({
  getActiveMobileVersion: jest.fn(),
  registerOrUpdateMobileDevice: jest.fn(),
  logoutMobileDevice: jest.fn(),
}));

const mockDbVersion: dbModule.MobileVersionResponse = {
  latestVersion: '1.0.1',
  minimumVersion: '1.0.0',
  forceUpdate: false,
  downloadUrl: 'https://example.com/app.apk',
  updateUrl: 'https://example.com/app.apk',
  releaseNotes: 'Bug fixes',
  checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  fileSize: 15420000,
  updateType: 'ota',
  channel: 'production',
  runtimeVersion: '1.0.0',
  publishedAt: '2026-08-03T10:00:00.000Z',
  isActive: true,
};

describe('MobileService', () => {
  let service: MobileService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        OtaUpdateStrategyService,
        ApkUpdateStrategyService,
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkUpdate', () => {
    it('should return OTA update when version is behind latest and updateType is ota', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue(
        mockDbVersion,
      );

      const result = await service.checkUpdate({
        currentVersion: '1.0.0',
        platform: 'android',
      });

      expect(result.updateAvailable).toBe(true);
      expect(result.updateType).toBe('ota');
      expect(result.forceUpdate).toBe(false);
      expect(result.latestVersion).toBe('1.0.1');
      expect(result.channel).toBeDefined();
      expect(result.runtimeVersion).toBeDefined();
    });

    it('should force APK update when version is below minimum', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue({
        ...mockDbVersion,
        updateType: 'apk',
      });

      const result = await service.checkUpdate({
        currentVersion: '0.9.0',
        platform: 'android',
      });

      expect(result.updateAvailable).toBe(true);
      expect(result.updateType).toBe('apk');
      expect(result.forceUpdate).toBe(true);
    });

    it('should return updateType none when app is on latest version', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue(
        mockDbVersion,
      );

      const result = await service.checkUpdate({
        currentVersion: '1.0.1',
        platform: 'android',
      });

      expect(result.updateAvailable).toBe(false);
      expect(result.updateType).toBe('none');
      expect(result.forceUpdate).toBe(false);
    });

    it('should return updateType none when app version exceeds latest', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue(
        mockDbVersion,
      );

      const result = await service.checkUpdate({
        currentVersion: '2.0.0',
        platform: 'android',
      });

      expect(result.updateAvailable).toBe(false);
      expect(result.updateType).toBe('none');
    });

    it('should handle legacy clients without currentVersion (backward compat)', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue(
        mockDbVersion,
      );

      const result = await service.checkUpdate({ platform: 'android' });

      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe('1.0.1');
    });

    it('should throw NotFoundException when no active version is found', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkUpdate({ currentVersion: '1.0.0', platform: 'android' }),
      ).rejects.toThrow(NotFoundException);

      expect(dbModule.getActiveMobileVersion).toHaveBeenCalledWith('android');
    });
  });

  describe('getLatestAndroidVersion (backward compat)', () => {
    it('should delegate to checkUpdate with android platform', async () => {
      (dbModule.getActiveMobileVersion as jest.Mock).mockResolvedValue(
        mockDbVersion,
      );

      const result = await service.getLatestAndroidVersion();

      expect(result).toBeDefined();
      expect(result.latestVersion).toBe('1.0.1');
      expect(dbModule.getActiveMobileVersion).toHaveBeenCalledWith('android');
    });
  });

  describe('registerDevice', () => {
    it('should call registerOrUpdateMobileDevice and return formatted success response', async () => {
      const mockResult = {
        deviceId: 'dev-123',
        status: 'ACTIVE',
        loginCount: 3,
        lastLoginAt: new Date('2026-08-05T02:00:00.000Z'),
      };
      (dbModule.registerOrUpdateMobileDevice as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const res = await service.registerDevice(
        'user-abc',
        {
          deviceId: 'dev-123',
          platform: 'android',
          brand: 'Samsung',
          model: 'Galaxy S24',
        },
        { ipAddress: '127.0.0.1', userAgent: 'Fieldra-Mobile/1.0.0' },
      );

      expect(dbModule.registerOrUpdateMobileDevice).toHaveBeenCalledWith({
        userId: 'user-abc',
        deviceId: 'dev-123',
        platform: 'android',
        brand: 'Samsung',
        model: 'Galaxy S24',
        ipAddress: '127.0.0.1',
        userAgent: 'Fieldra-Mobile/1.0.0',
      });
      expect(res.success).toBe(true);
      expect(res.data.deviceId).toBe('dev-123');
      expect(res.data.status).toBe('ACTIVE');
      expect(res.data.loginCount).toBe(3);
    });
  });

  describe('logoutDevice', () => {
    it('should call logoutMobileDevice and return formatted success response', async () => {
      const mockResult = {
        deviceId: 'dev-123',
        status: 'INACTIVE',
        lastLogoutAt: new Date('2026-08-05T02:30:00.000Z'),
      };
      (dbModule.logoutMobileDevice as jest.Mock).mockResolvedValue(mockResult);

      const res = await service.logoutDevice(
        'user-abc',
        { deviceId: 'dev-123' },
        { ipAddress: '127.0.0.1', userAgent: 'Fieldra-Mobile/1.0.0' },
      );

      expect(dbModule.logoutMobileDevice).toHaveBeenCalledWith({
        userId: 'user-abc',
        deviceId: 'dev-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Fieldra-Mobile/1.0.0',
      });
      expect(res.success).toBe(true);
      expect(res.data.deviceId).toBe('dev-123');
      expect(res.data.status).toBe('INACTIVE');
    });
  });
});
