export type VesselCoordinate = {
  lat: number;
  lng: number;
};

export type DirectionPosition = VesselCoordinate & {
  course: number | null;
  previousPosition?: VesselCoordinate;
};

export type VesselTrack = {
  previous: VesselCoordinate;
  current: VesselCoordinate;
  bearing: number;
  mocked: boolean;
};

const MOCK_TRACK_DISTANCE_DEGREES = 0.01;

function normalizeBearing(degrees: number) {
  return (degrees + 360) % 360;
}

/** Return the initial bearing, in degrees clockwise from true north. */
export function initialBearing(from: VesselCoordinate, to: VesselCoordinate) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI);
}

/**
 * Build a current-to-previous track. The fallback is deliberately temporary:
 * live history can be supplied later without changing the map rendering.
 */
export function getVesselTrack(position: DirectionPosition): VesselTrack {
  if (position.previousPosition) {
    return {
      previous: position.previousPosition,
      current: { lat: position.lat, lng: position.lng },
      bearing: initialBearing(position.previousPosition, position),
      mocked: false,
    };
  }

  const course = position.course ?? 0;
  const bearingRadians = (course * Math.PI) / 180;
  const latitudeDelta = MOCK_TRACK_DISTANCE_DEGREES * Math.cos(bearingRadians);
  const longitudeScale = Math.max(Math.cos((position.lat * Math.PI) / 180), 0.2);
  const longitudeDelta = (MOCK_TRACK_DISTANCE_DEGREES * Math.sin(bearingRadians)) / longitudeScale;
  const previous = {
    lat: position.lat - latitudeDelta,
    lng: position.lng - longitudeDelta,
  };

  return {
    previous,
    current: { lat: position.lat, lng: position.lng },
    bearing: initialBearing(previous, position),
    mocked: true,
  };
}
