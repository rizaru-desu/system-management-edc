import { compareVersions } from './version-comparator.util';

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('should return -1 when v1 < v2', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
  });

  it('should return 1 when v1 > v2', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
  });

  it('should handle versions with different number of segments', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1', '1.0.0')).toBe(0);
  });

  it('should strip leading v prefix', () => {
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('v1.0.1', 'v1.0.0')).toBe(1);
  });

  it('should handle pre-release identifiers gracefully', () => {
    expect(compareVersions('1.0.0-beta', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1-rc1', '1.0.0')).toBe(1);
  });

  it('should return 0 for empty strings', () => {
    expect(compareVersions('', '')).toBe(0);
    expect(compareVersions('', '1.0.0')).toBe(0);
  });
});
