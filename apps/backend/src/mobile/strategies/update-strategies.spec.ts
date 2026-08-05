import { OtaUpdateStrategyService } from './ota-update.strategy';
import { ApkUpdateStrategyService } from './apk-update.strategy';
import type { MobileVersionResponse } from '@repo/db';

jest.mock('@repo/db', () => ({}));

const baseDbVersion: MobileVersionResponse = {
  latestVersion: '1.0.1',
  minimumVersion: '1.0.0',
  forceUpdate: false,
  downloadUrl: 'https://example.com/app.apk',
  updateUrl: 'https://example.com/app.apk',
  releaseNotes: 'Bug fixes',
  checksum: 'abc123',
  fileSize: 15420000,
  updateType: 'ota',
  channel: 'production',
  runtimeVersion: '1.0.0',
  publishedAt: '2026-08-03T10:00:00.000Z',
  isActive: true,
};

describe('OtaUpdateStrategyService', () => {
  let strategy: OtaUpdateStrategyService;

  beforeEach(() => {
    strategy = new OtaUpdateStrategyService();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return updateType ota when update is available', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false);
    expect(result.updateType).toBe('ota');
    expect(result.updateAvailable).toBe(true);
    expect(result.channel).toBeDefined();
    expect(result.runtimeVersion).toBeDefined();
  });

  it('should return updateType none when no update available', () => {
    const result = strategy.buildPayload(baseDbVersion, false, false);
    expect(result.updateType).toBe('none');
    expect(result.updateAvailable).toBe(false);
  });

  it('should use client channel when provided', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false, 'staging');
    expect(result.channel).toBe('staging');
  });

  it('should fall back to dbVersion channel when client channel is not provided', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false);
    expect(result.channel).toBe('production');
  });

  it('should include backward-compat fields', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false);
    expect(result.updateUrl).toBeDefined();
    expect(result.publishedAt).toBeDefined();
    expect(result.isActive).toBeDefined();
  });
});

describe('ApkUpdateStrategyService', () => {
  let strategy: ApkUpdateStrategyService;

  beforeEach(() => {
    strategy = new ApkUpdateStrategyService();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return updateType apk when update is available', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false);
    expect(result.updateType).toBe('apk');
    expect(result.updateAvailable).toBe(true);
    expect(result.downloadUrl).toBeDefined();
    expect(result.checksum).toBeDefined();
    expect(result.fileSize).toBeDefined();
  });

  it('should return updateType none when no update available', () => {
    const result = strategy.buildPayload(baseDbVersion, false, false);
    expect(result.updateType).toBe('none');
    expect(result.updateAvailable).toBe(false);
  });

  it('should set forceUpdate when passed true', () => {
    const result = strategy.buildPayload(baseDbVersion, true, true);
    expect(result.forceUpdate).toBe(true);
  });

  it('should include releaseNotes and latestVersion', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false);
    expect(result.releaseNotes).toBe('Bug fixes');
    expect(result.latestVersion).toBe('1.0.1');
    expect(result.version).toBe('1.0.1');
  });

  it('should include backward-compat fields', () => {
    const result = strategy.buildPayload(baseDbVersion, true, false);
    expect(result.updateUrl).toBeDefined();
    expect(result.publishedAt).toBeDefined();
    expect(result.isActive).toBeDefined();
  });
});
