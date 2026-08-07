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
  /** The nearest eligible candidate; null when none is within coverage. */
  servicePointId: string | null;
  /**
   * When assigned, the winning candidate; otherwise the nearest candidate
   * regardless of coverage (for reporting). Null with no candidates at all.
   */
  nearestServicePointId: string | null;
  nearestServicePointName: string | null;
  /** Distance (km, 2dp) to the reported candidate. */
  distanceKm: number | null;
  assignmentStatus: AssignmentStatus;
}

/**
 * Picks the nearest *eligible* service point for a coordinate from an
 * in-memory candidate list (loaded once per import — never per row). A
 * candidate is eligible when it has no `coverageRadiusKm`, or the distance
 * falls within it — so a nearby service point with a tight radius loses to
 * a farther one whose coverage actually reaches the merchant.
 */
export function findNearestServicePoint(
  latitude: number,
  longitude: number,
  candidates: ServicePointCandidate[],
): NearestServicePointResult {
  // Nearest overall (for reporting) and nearest *eligible* — a candidate is
  // eligible when it has no radius, or the distance falls within it. The two
  // can differ: a nearby service point with a tight radius loses to a
  // slightly farther one whose coverage actually reaches the merchant.
  let nearest: ServicePointCandidate | null = null;
  let nearestDistance = Infinity;
  let eligible: ServicePointCandidate | null = null;
  let eligibleDistance = Infinity;

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
    const withinCoverage =
      candidate.coverageRadiusKm === null ||
      Math.round(distance * 100) / 100 <= candidate.coverageRadiusKm;
    if (withinCoverage && distance < eligibleDistance) {
      eligible = candidate;
      eligibleDistance = distance;
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

  if (!eligible) {
    // Candidates exist, but every one is out of coverage — report the
    // nearest so the preview shows how far off it was.
    return {
      servicePointId: null,
      nearestServicePointId: nearest.id,
      nearestServicePointName: nearest.name,
      distanceKm: Math.round(nearestDistance * 100) / 100,
      assignmentStatus: 'OUTSIDE_COVERAGE_RADIUS',
    };
  }

  return {
    servicePointId: eligible.id,
    nearestServicePointId: eligible.id,
    nearestServicePointName: eligible.name,
    distanceKm: Math.round(eligibleDistance * 100) / 100,
    assignmentStatus: 'ASSIGNED',
  };
}
