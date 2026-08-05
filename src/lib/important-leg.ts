import { FLEET } from "./vessels";

export const IMPORTANT_LEG_SLUG = "prima-regatina";

export type Coordinate = { lat: number; lng: number };

export type ImportantLeg = {
  id: string;
  slug: string;
  name: string;
  start: Coordinate;
  end: Coordinate;
  startsAt: string;
  endsAt: string;
  corridorMeters: number;
  status: "scheduled" | "active" | "finished";
};

export type TrackPoint = Coordinate & {
  id: number;
  mmsi: string;
  course: number | null;
  speedKnots: number;
  receivedAt: string;
  legId: string | null;
};

export type LegTrack = {
  mmsi: string;
  name: string;
  color: string;
  points: TrackPoint[];
};

export type LegResult = {
  rank: number;
  mmsi: string;
  name: string;
  color: string;
  finishedAt: string | null;
  elapsedSeconds: number | null;
  status: "finished" | "racing";
};

export function decimalDegrees(degrees: number, minutes: number) {
  return degrees + minutes / 60;
}

export const PRIMA_REGATINA_ROUTE = {
  start: { lat: decimalDegrees(37, 27.015), lng: decimalDegrees(24, 14.232) },
  end: { lat: decimalDegrees(37, 37.942), lng: decimalDegrees(24, 4.506) },
};

export function haversineMeters(a: Coordinate, b: Coordinate) {
  const radius = 6_371_000;
  const toRadians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRadians;
  const dLng = (b.lng - a.lng) * toRadians;
  const lat1 = a.lat * toRadians;
  const lat2 = b.lat * toRadians;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function formatElapsed(seconds: number | null) {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function computeLegResults(leg: ImportantLeg, tracks: LegTrack[]): LegResult[] {
  const results = tracks.map((track) => {
    const finish = track.points.find((point) => (
      point.legId === leg.id && haversineMeters(point, leg.end) <= 80
    ));
    return {
      rank: 0,
      mmsi: track.mmsi,
      name: track.name,
      color: track.color,
      finishedAt: finish?.receivedAt ?? null,
      elapsedSeconds: finish
        ? Math.max(0, Math.round((Date.parse(finish.receivedAt) - Date.parse(leg.startsAt)) / 1000))
        : null,
      status: finish ? "finished" as const : "racing" as const,
    };
  }).sort((a, b) => {
    if (a.elapsedSeconds === null) return 1;
    if (b.elapsedSeconds === null) return -1;
    return a.elapsedSeconds - b.elapsedSeconds;
  });
  return results.map((result, index) => ({ ...result, rank: index + 1 }));
}

export function emptyTracks(): LegTrack[] {
  return FLEET.map((vessel) => ({ ...vessel, points: [] }));
}
