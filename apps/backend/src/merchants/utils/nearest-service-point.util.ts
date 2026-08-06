/** Mean Earth radius in kilometres (IUGG). */
const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two coordinates in kilometres via the
 * Haversine formula. Accurate to ~0.5% (spherical Earth), which is plenty
 * for choosing the nearest service point.
 */
export function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** The service point fields the nearest-match search needs. */
export interface ServicePointCandidate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Service area radius (km); null = unlimited. */
  coverageRadiusKm: number | null;
}

export type AssignmentStatus =
  'ASSIGNED' | 'OUTSIDE_COVERAGE_RADIUS' | 'NO_ACTIVE_SERVICE_POINT';

export interface NearestServicePointResult {
  /** Assigned only when the nearest candidate is within coverage. */
  servicePointId: string | null;
  /** The nearest candidate regardless of coverage; null with no candidates. */
  nearestServicePointId: string | null;
  nearestServicePointName: string | null;
  /** Distance (km, 2dp) to the nearest candidate. */
  distanceKm: number | null;
  assignmentStatus: AssignmentStatus;
}

/**
 * Picks the nearest service point for a coordinate from an in-memory
 * candidate list (loaded once per import — never per row). A candidate with
 * a configured `coverageRadiusKm` only wins assignment when the distance is
 * within it; without one the nearest candidate always wins.
 */
export function findNearestServicePoint(
  latitude: number,
  longitude: number,
  candidates: ServicePointCandidate[],
): NearestServicePointResult {
  let nearest: ServicePointCandidate | null = null;
  let nearestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = haversineDistanceKm(
      latitude,
      longitude,
      candidate.latitude,
      candidate.longitude,
    );
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  if (!nearest) {
    return {
      servicePointId: null,
      nearestServicePointId: null,
      nearestServicePointName: null,
      distanceKm: null,
      assignmentStatus: 'NO_ACTIVE_SERVICE_POINT',
    };
  }

  const distanceKm = Math.round(nearestDistance * 100) / 100;
  const withinCoverage =
    nearest.coverageRadiusKm === null || distanceKm <= nearest.coverageRadiusKm;

  return {
    servicePointId: withinCoverage ? nearest.id : null,
    nearestServicePointId: nearest.id,
    nearestServicePointName: nearest.name,
    distanceKm,
    assignmentStatus: withinCoverage ? 'ASSIGNED' : 'OUTSIDE_COVERAGE_RADIUS',
  };
}
