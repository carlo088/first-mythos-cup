import { readFileSync } from "node:fs";

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!projectRef || !accessToken) {
  console.error("SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required.");
  process.exit(1);
}

const races = [
  {
    id: "b8b22a15-4705-4ae6-9d2d-0b15f4ad3c91", slug: "prima-regatina", name: "Prima Regatina",
    start: { lat: 37 + 27.015 / 60, lng: 24 + 14.232 / 60 },
    end: { lat: 37 + 37.942 / 60, lng: 24 + 4.506 / 60 },
    startsAt: new Date("2026-08-05T18:00:00Z"), finishes: [27, 29, 30], status: "finished",
  },
  {
    id: "2e1347f4-0c6f-4d45-a3ce-e14629762d44", slug: "kea-sprint", name: "Kea Sprint",
    start: { lat: 37.6052, lng: 24.1085 }, end: { lat: 37.7055, lng: 24.2460 },
    startsAt: new Date("2026-08-06T09:00:00Z"), finishes: [30, 26, 28], status: "active",
  },
  {
    id: "7cab5f38-e092-48b4-b038-d4be63e2818c", slug: "sounion-dash", name: "Sounion Dash",
    start: { lat: 37.7055, lng: 24.2460 }, end: { lat: 37.6500, lng: 24.0300 },
    startsAt: new Date("2026-08-07T15:30:00Z"), finishes: [29, 30, 25], status: "finished",
  },
];
const boats = [
  { mmsi: "247520340", lateral: 0.0026, phase: 0.2 },
  { mmsi: "240576800", lateral: -0.0020, phase: 1.5 },
  { mmsi: "240608700", lateral: 0.0014, phase: 2.8 },
];

function escape(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function interpolate(a, b, progress) { return a + (b - a) * progress; }
function bearing(a, b) {
  const toRad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * toRad) * Math.cos(b.lat * toRad);
  const x = Math.cos(a.lat * toRad) * Math.sin(b.lat * toRad)
    - Math.sin(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.cos((b.lng - a.lng) * toRad);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}
function distanceNm(a, b) {
  const r = 3440.065;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const v = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

const rows = [];
for (const [raceIndex, race] of races.entries()) {
  for (const [boatIndex, boat] of boats.entries()) {
    const finishMinutes = race.finishes[boatIndex];
    // Two history points are deliberately outside both the race time and its corridor.
    const approach = { lat: race.start.lat - 0.015 - boatIndex * 0.002, lng: race.start.lng + 0.018 + raceIndex * 0.002 };
    const prestart = { lat: race.start.lat - 0.009 - boatIndex * 0.001, lng: race.start.lng + 0.011 };
    rows.push({ ...approach, mmsi: boat.mmsi, at: new Date(race.startsAt.getTime() - 15 * 60_000), course: bearing(approach, prestart), speed: 7.1 });
    rows.push({ ...prestart, mmsi: boat.mmsi, at: new Date(race.startsAt.getTime() - 5 * 60_000), course: bearing(prestart, race.start), speed: 6.4 });
    let previous = prestart;
    let previousAt = new Date(race.startsAt.getTime() - 5 * 60_000);
    for (const minute of [...new Set([0, 5, 10, 15, 20, 25, finishMinutes])].sort((a, b) => a - b)) {
      const progress = Math.min(1, minute / finishMinutes);
      const curve = Math.sin(progress * Math.PI) * boat.lateral
        + Math.sin(progress * Math.PI * 3 + boat.phase + raceIndex) * 0.00055;
      const point = progress >= 1 ? { ...race.end } : {
        lat: interpolate(race.start.lat, race.end.lat, progress) + curve,
        lng: interpolate(race.start.lng, race.end.lng, progress) + curve * 0.45,
      };
      const at = new Date(race.startsAt.getTime() + minute * 60_000);
      const hours = Math.max((at - previousAt) / 3_600_000, 1 / 60);
      rows.push({ ...point, mmsi: boat.mmsi, at, course: bearing(previous, point), speed: distanceNm(previous, point) / hours });
      previous = point;
      previousAt = at;
    }
    const departure = { lat: race.end.lat + 0.014 + boatIndex * 0.001, lng: race.end.lng - 0.017 };
    rows.push({ ...departure, mmsi: boat.mmsi, at: new Date(race.startsAt.getTime() + 45 * 60_000), course: bearing(previous, departure), speed: 7.6 });
  }
}

const migration = readFileSync(new URL("../supabase/migrations/20260805180000_important_legs.sql", import.meta.url), "utf8");
const legValues = races.map((race) => `(${escape(race.id)}, ${escape(race.slug)}, ${escape(race.name)}, ${race.start.lat}, ${race.start.lng}, ${race.end.lat}, ${race.end.lng}, ${escape(race.startsAt.toISOString())}, ${escape(new Date(race.startsAt.getTime() + 30 * 60_000).toISOString())}, 1800, ${escape(race.status)})`).join(",\n");
const mockScores = [[10, 7, 4], [5, 10, 7], [7, 4, 10]];
const scoreValues = races.flatMap((race, raceIndex) => boats.map((boat, boatIndex) => `(${escape(race.id)}, ${escape(boat.mmsi)}, ${mockScores[raceIndex][boatIndex]})`)).join(",\n");
const positionValues = rows.map((row) => `(${escape(row.mmsi)}, ${row.lat.toFixed(7)}, ${row.lng.toFixed(7)}, ${row.course.toFixed(1)}, ${row.speed.toFixed(1)}, 8, ${escape(row.at.toISOString())}, ${escape(new Date().toISOString())}, 'important-leg-simulation', null)`).join(",\n");
const sql = `${migration}
insert into public.race_legs (id, slug, name, start_latitude, start_longitude, end_latitude, end_longitude, starts_at, ends_at, corridor_meters, status) values
${legValues}
on conflict (slug) do update set name=excluded.name, start_latitude=excluded.start_latitude, start_longitude=excluded.start_longitude, end_latitude=excluded.end_latitude, end_longitude=excluded.end_longitude, starts_at=excluded.starts_at, ends_at=excluded.ends_at, corridor_meters=excluded.corridor_meters, status=excluded.status;
insert into public.leg_scores (leg_id, mmsi, points) values
${scoreValues}
on conflict (leg_id, mmsi) do update set points=excluded.points, updated_at=now();
delete from public.vessel_positions where source = 'important-leg-simulation';
insert into public.vessel_positions (mmsi, latitude, longitude, course, speed_knots, navigation_status, received_at, captured_at, source, leg_id) values
${positionValues}
on conflict (mmsi, received_at) do update set latitude=excluded.latitude, longitude=excluded.longitude, course=excluded.course, speed_knots=excluded.speed_knots, captured_at=excluded.captured_at, source=excluded.source, leg_id=excluded.leg_id;`;

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
});
if (!response.ok) {
  const errorBody = await response.json().catch(() => ({}));
  console.error(`Supabase simulation write failed with HTTP ${response.status}: ${errorBody.message ?? "database rejected the query"}`);
  process.exit(1);
}
console.log(`Stored ${rows.length} simulated positions for ${boats.length} boats across ${races.length} races.`);
