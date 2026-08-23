import { haversineMeters, type Coordinate } from "./important-leg";

export type ReconstructedPoint = Coordinate & { receivedAt: string; course: number; speedKnots: number };

function bearing(a: Coordinate, b: Coordinate) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

export function smoothControlPoints(points: Coordinate[], passes = 2) {
  let result = points;
  for (let pass = 0; pass < passes; pass += 1) {
    if (result.length < 3) break;
    const next = [result[0]];
    for (let index = 0; index < result.length - 1; index += 1) {
      const a = result[index]; const b = result[index + 1];
      next.push({ lat: a.lat * 0.75 + b.lat * 0.25, lng: a.lng * 0.75 + b.lng * 0.25 });
      next.push({ lat: a.lat * 0.25 + b.lat * 0.75, lng: a.lng * 0.25 + b.lng * 0.75 });
    }
    next.push(result[result.length - 1]); result = next;
  }
  return result;
}

export function reconstructTrack(controlPoints: Coordinate[], startsAt: string, endsAt: string, intervalMinutes = 5) {
  if (controlPoints.length < 2) throw new Error("At least two control points are required.");
  const start = Date.parse(startsAt); const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("Invalid time range.");
  const path = smoothControlPoints(controlPoints);
  const segments = path.slice(1).map((point, index) => haversineMeters(path[index], point));
  const total = segments.reduce((sum, value) => sum + value, 0);
  if (total < 1) throw new Error("The route is too short.");
  const times = [] as number[]; const step = intervalMinutes * 60_000;
  for (let time = start; time < end; time += step) times.push(time);
  times.push(end);
  return times.map((time, timeIndex): ReconstructedPoint => {
    const target = ((time - start) / (end - start)) * total;
    let covered = 0; let segmentIndex = 0;
    while (segmentIndex < segments.length - 1 && covered + segments[segmentIndex] < target) covered += segments[segmentIndex++];
    const ratio = segments[segmentIndex] ? (target - covered) / segments[segmentIndex] : 0;
    const a = path[segmentIndex]; const b = path[segmentIndex + 1];
    const point = { lat: a.lat + (b.lat - a.lat) * ratio, lng: a.lng + (b.lng - a.lng) * ratio };
    const nextTime = times[Math.min(timeIndex + 1, times.length - 1)];
    const durationHours = Math.max(1, nextTime - time) / 3_600_000;
    const nextTarget = Math.min(total, ((nextTime - start) / (end - start)) * total);
    return { ...point, receivedAt: new Date(time).toISOString(), course: bearing(a, b), speedKnots: timeIndex === times.length - 1 ? 0 : ((nextTarget - target) / 1852) / durationHours };
  });
}
