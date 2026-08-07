import {
  findNearestServicePoint,
  haversineDistanceKm,
} from './nearest-service-point.util';
import type { ServicePointCandidate } from './nearest-service-point.util';

const candidate = (
  id: string,
  latitude: number,
  longitude: number,
  coverageRadiusKm: number | null = null,
): ServicePointCandidate => ({
  id,
  name: `SP ${id}`,
  latitude,
  longitude,
  coverageRadiusKm,
});

describe('haversineDistanceKm', () => {
  it('is zero for identical coordinates', () => {
    expect(haversineDistanceKm(-6.2, 106.8, -6.2, 106.8)).toBe(0);
  });

  it('matches a known city distance within tolerance', () => {
    // Jakarta (Monas) → Bandung (Gedung Sate) is roughly 116 km.
    const distance = haversineDistanceKm(-6.1754, 106.8272, -6.9025, 107.6191);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(122);
  });

  it('is symmetric', () => {
    const there = haversineDistanceKm(-6.2, 106.8, -6.3, 106.7);
    const back = haversineDistanceKm(-6.3, 106.7, -6.2, 106.8);
    expect(there).toBeCloseTo(back, 10);
  });
});

describe('findNearestServicePoint', () => {
  it('reports NO_ACTIVE_SERVICE_POINT with no candidates', () => {
    expect(findNearestServicePoint(-6.2, 106.8, [])).toEqual({
      servicePointId: null,
      nearestServicePointId: null,
      nearestServicePointName: null,
      distanceKm: null,
      assignmentStatus: 'NO_ACTIVE_SERVICE_POINT',
    });
  });

  it('assigns the nearest candidate when no radius is configured', () => {
    const result = findNearestServicePoint(-6.2, 106.8, [
      candidate('far', -6.9, 107.6),
      candidate('near', -6.21, 106.81),
    ]);
    expect(result.servicePointId).toBe('near');
    expect(result.assignmentStatus).toBe('ASSIGNED');
    expect(result.distanceKm).toBeLessThan(2);
  });

  it('rounds the distance to two decimals', () => {
    const result = findNearestServicePoint(-6.2, 106.8, [
      candidate('sp', -6.25, 106.85),
    ]);
    expect(result.distanceKm).toBe(Math.round(result.distanceKm! * 100) / 100);
  });

  it('withholds assignment when the nearest candidate is outside its radius', () => {
    // ~116 km away with a 50 km radius.
    const result = findNearestServicePoint(-6.1754, 106.8272, [
      candidate('bdg', -6.9025, 107.6191, 50),
    ]);
    expect(result.servicePointId).toBeNull();
    expect(result.nearestServicePointId).toBe('bdg');
    expect(result.assignmentStatus).toBe('OUTSIDE_COVERAGE_RADIUS');
    expect(result.distanceKm).toBeGreaterThan(100);
  });

  it('assigns when the distance is within the configured radius', () => {
    const result = findNearestServicePoint(-6.2, 106.8, [
      candidate('sp', -6.21, 106.81, 5),
    ]);
    expect(result.servicePointId).toBe('sp');
    expect(result.assignmentStatus).toBe('ASSIGNED');
  });

  it('picks by distance, not list order', () => {
    const result = findNearestServicePoint(-6.2, 106.8, [
      candidate('a', -7.0, 107.0),
      candidate('b', -6.2005, 106.8005),
      candidate('c', -6.5, 106.9),
    ]);
    expect(result.servicePointId).toBe('b');
  });

  it('skips a nearer candidate whose radius excludes the merchant', () => {
    // 'near' is ~1.5 km away but only covers 1 km; 'far' is ~15 km away with
    // no radius — the nearest *eligible* candidate wins.
    const result = findNearestServicePoint(-6.2, 106.8, [
      candidate('near', -6.21, 106.81, 1),
      candidate('far', -6.3, 106.9),
    ]);
    expect(result.servicePointId).toBe('far');
    expect(result.nearestServicePointName).toBe('SP far');
    expect(result.assignmentStatus).toBe('ASSIGNED');
    expect(result.distanceKm).toBeGreaterThan(2);
  });

  it('reports the nearest candidate when every radius excludes the merchant', () => {
    const result = findNearestServicePoint(-6.2, 106.8, [
      candidate('near', -6.21, 106.81, 1),
      candidate('far', -6.3, 106.9, 5),
    ]);
    expect(result.servicePointId).toBeNull();
    expect(result.nearestServicePointId).toBe('near');
    expect(result.assignmentStatus).toBe('OUTSIDE_COVERAGE_RADIUS');
  });
});
