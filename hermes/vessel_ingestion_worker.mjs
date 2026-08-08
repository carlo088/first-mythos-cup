#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const FLEET = ["247520340", "240576800", "240608700"];
const FIVE_MINUTES = 5 * 60_000;
const FORTY_FIVE_MINUTES = 45 * 60_000;

export function greeceHour(now) {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens", hour: "2-digit", hour12: false,
  }).format(now));
}

export function greeceDateKey(now) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function greeceMinute(now) {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens", minute: "2-digit",
  }).format(now));
}

function isTenPmRunDue(now, lastRunAt) {
  const alreadyRanAtTen = lastRunAt && greeceDateKey(lastRunAt) === greeceDateKey(now) &&
    greeceHour(lastRunAt) === 22 && greeceMinute(lastRunAt) < 5;
  return greeceHour(now) === 22 && greeceMinute(now) < 5 && !alreadyRanAtTen;
}

export function ingestionCadence(now, activeRace) {
  const hour = greeceHour(now);
  if (hour >= 22 || hour < 8) return null;
  return activeRace ? FIVE_MINUTES : FORTY_FIVE_MINUTES;
}

export function shouldIngest({ now, lastRunAt, activeRace, mode }) {
  if (mode !== "live") return false;
  if (isTenPmRunDue(now, lastRunAt)) return true;
  const cadence = ingestionCadence(now, activeRace);
  if (cadence === null) return false;
  return !lastRunAt || now.getTime() - lastRunAt.getTime() >= cadence;
}

function sqlLiteral(value) { return `'${String(value).replaceAll("'", "''")}'`; }

async function hasActiveRace(now, environment) {
  const response = await fetch(`${environment.SUPABASE_URL}/rest/v1/race_legs?starts_at=lte.${encodeURIComponent(now.toISOString())}&ends_at=gte.${encodeURIComponent(now.toISOString())}&select=id&limit=1`, {
    headers: { apikey: environment.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${environment.SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!response.ok) throw new Error(`leg lookup HTTP ${response.status}`);
  return ((await response.json()).length ?? 0) > 0;
}

async function fetchVessel(mmsi, environment) {
  const url = new URL("https://api.myshiptracking.com/api/v2/vessel");
  url.searchParams.set("mmsi", mmsi);
  url.searchParams.set("response", "simple");
  const response = await fetch(url, { headers: { "x-api-key": environment.MYSHIPTRACKING_API_KEY, Accept: "application/json" } });
  if (!response.ok) throw new Error(`vessel ${mmsi} HTTP ${response.status}`);
  const body = await response.json();
  if (body.status !== "success" || !body.data) throw new Error(`vessel ${mmsi} returned no data`);
  return body.data;
}

export function positionInsertQuery(positions, capturedAt) {
  const values = positions.map((position) => `(${sqlLiteral(String(position.mmsi))}, ${position.lat}, ${position.lng}, ${position.course === 511 ? "null" : position.course}, ${position.speed}, ${position.nav_status}, ${sqlLiteral(position.received)}, ${sqlLiteral(capturedAt)}, 'myshiptracking', null)`).join(",\n");
  return `insert into public.vessel_positions (mmsi, latitude, longitude, course, speed_knots, navigation_status, received_at, captured_at, source, leg_id) values ${values} on conflict (mmsi, received_at) do update set latitude=excluded.latitude, longitude=excluded.longitude, course=excluded.course, speed_knots=excluded.speed_knots, navigation_status=excluded.navigation_status, captured_at=excluded.captured_at, source=excluded.source;`;
}

async function storePositions(positions, environment) {
  const capturedAt = new Date().toISOString();
  const query = positionInsertQuery(positions, capturedAt);
  const response = await fetch(`https://api.supabase.com/v1/projects/${environment.SUPABASE_PROJECT_REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${environment.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Supabase write HTTP ${response.status}`);
}

export async function runWorker(environment = process.env) {
  let lastRunAt = null;
  const tick = async () => {
    try {
      const now = new Date();
      if (environment.VESSEL_DATA_MODE !== "live") return;
      const activeRace = await hasActiveRace(now, environment);
      if (!shouldIngest({ now, lastRunAt, activeRace, mode: environment.VESSEL_DATA_MODE })) return;
      const positions = [];
      for (const mmsi of FLEET) positions.push(await fetchVessel(mmsi, environment));
      await storePositions(positions, environment);
      lastRunAt = now;
      console.log(`Vessel ingestion stored ${positions.length} reports (${activeRace ? "regatta" : "daytime"} cadence).`);
    } catch (error) {
      console.error(`Vessel ingestion failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };
  await tick();
  return setInterval(() => void tick(), 60_000);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void runWorker();
