import { Test, TestingModule } from '@nestjs/testing';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import type { MobileVersionResponseDto } from './dto/mobile-version-response.dto';

jest.mock('@repo/db', () => ({
  getActiveMobileVersion: jest.fn(),
}));

describe('MobileController', () => {
  let controller: MobileController;
  let service: jest.Mocked<Partial<MobileService>>;

  beforeEach(async () => {
    service = {
      checkUpdate: jest.fn(),
      getLatestAndroidVersion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MobileController],
      providers: [
        {
          provide: MobileService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<MobileController>(MobileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVersion', () => {
    it('should return OTA update response when updateType is ota', async () => {
      const mockData: MobileVersionResponseDto = {
        updateAvailable: true,
        updateType: 'ota',
        forceUpdate: false,
        minimumVersion: '1.0.0',
        latestVersion: '1.0.1',
        releaseNotes: 'Bug fixes',
        channel: 'production',
        runtimeVersion: '1.0.0',
        version: '1.0.1',
        downloadUrl: 'https://example.com/app.apk',
        updateUrl: 'https://example.com/app.apk',
        checksum:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        fileSize: 15420000,
        publishedAt: '2026-08-03T10:00:00.000Z',
        isActive: true,
      };

      service.checkUpdate?.mockResolvedValue(mockData);

      const result = await controller.getVersion({
        currentVersion: '1.0.0',
        platform: 'android',
        channel: 'production',
        runtimeVersion: '1.0.0',
      });

      expect(result).toEqual(mockData);
      expect(service.checkUpdate).toHaveBeenCalledTimes(1);
    });

    it('should return APK update response when updateType is apk', async () => {
      const mockData: MobileVersionResponseDto = {
        updateAvailable: true,
        updateType: 'apk',
        forceUpdate: true,
        minimumVersion: '1.0.0',
        latestVersion: '2.0.0',
        releaseNotes: 'Major release',
        version: '2.0.0',
        downloadUrl: 'https://example.com/app-v2.apk',
        updateUrl: 'https://example.com/app-v2.apk',
        checksum: 'abc123',
        fileSize: 20000000,
        publishedAt: '2026-08-03T10:00:00.000Z',
        isActive: true,
      };

      service.checkUpdate?.mockResolvedValue(mockData);

      const result = await controller.getVersion({
        currentVersion: '0.9.0',
        platform: 'android',
      });

      expect(result).toEqual(mockData);
      expect(service.checkUpdate).toHaveBeenCalledTimes(1);
    });

    it('should return no-update response when app is current', async () => {
      const mockData: MobileVersionResponseDto = {
        updateAvailable: false,
        updateType: 'none',
        forceUpdate: false,
        minimumVersion: '1.0.0',
        latestVersion: '1.0.1',
        releaseNotes: 'Bug fixes',
        downloadUrl: 'https://example.com/app.apk',
        updateUrl: 'https://example.com/app.apk',
        checksum: '',
        fileSize: 0,
        publishedAt: '2026-08-03T10:00:00.000Z',
        isActive: true,
      };

      service.checkUpdate?.mockResolvedValue(mockData);

      const result = await controller.getVersion({
        currentVersion: '1.0.1',
        platform: 'android',
      });

      expect(result).toEqual(mockData);
    });

    it('should handle legacy clients without currentVersion', async () => {
      const mockData: MobileVersionResponseDto = {
        updateAvailable: true,
        updateType: 'apk',
        forceUpdate: false,
        minimumVersion: '1.0.0',
        latestVersion: '1.0.1',
        releaseNotes: 'Bug fixes',
        downloadUrl: 'https://example.com/app.apk',
        updateUrl: 'https://example.com/app.apk',
        checksum:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        fileSize: 15420000,
        publishedAt: '2026-08-03T10:00:00.000Z',
        isActive: true,
      };

      service.checkUpdate?.mockResolvedValue(mockData);

      const result = await controller.getVersion({});

      expect(result).toEqual(mockData);
      expect(service.checkUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerDevice', () => {
    it('should extract userId from session and call service.registerDevice', async () => {
      const mockSession = {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      } as any;
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test-Agent' },
      } as any;
      const mockPayload = {
        deviceId: 'dev-123',
        platform: 'android',
        brand: 'Samsung',
      };
      const mockServiceResponse = {
        success: true,
        message: 'Device registered successfully',
        data: {
          deviceId: 'dev-123',
          status: 'ACTIVE',
          loginCount: 1,
          lastLoginAt: '2026-08-05T02:00:00.000Z',
        },
      };

      service.registerDevice = jest.fn().mockResolvedValue(mockServiceResponse);

      const res = await controller.registerDevice(
        mockPayload,
        mockSession,
        mockReq,
      );

      expect(service.registerDevice).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ deviceId: 'dev-123', platform: 'android' }),
        { ipAddress: '127.0.0.1', userAgent: 'Test-Agent' },
      );
      expect(res).toEqual(mockServiceResponse);
    });
  });

  describe('logoutDevice', () => {
    it('should extract userId from session and call service.logoutDevice', async () => {
      const mockSession = {
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      } as any;
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test-Agent' },
      } as any;
      const mockPayload = { deviceId: 'dev-123' };
      const mockServiceResponse = {
        success: true,
        message: 'Device logged out successfully',
        data: {
          deviceId: 'dev-123',
          status: 'INACTIVE',
          lastLogoutAt: '2026-08-05T02:30:00.000Z',
        },
      };

      service.logoutDevice = jest.fn().mockResolvedValue(mockServiceResponse);

      const res = await controller.logoutDevice(
        mockPayload,
        mockSession,
        mockReq,
      );

      expect(service.logoutDevice).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ deviceId: 'dev-123' }),
        { ipAddress: '127.0.0.1', userAgent: 'Test-Agent' },
      );
      expect(res).toEqual(mockServiceResponse);
    });
  });
});
