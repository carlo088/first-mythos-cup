import type { VesselPosition } from "@/lib/myshiptracking";
import { fleetVessel } from "@/lib/vessels";
import { selectLivePositionRow } from "./live-position-selection";

export { selectLivePositionRow };

export type StoredPositionRow = {
  id: number;
  mmsi: string;
  latitude: number;
  longitude: number;
  course: number | null;
  speed_knots: number;
  navigation_status: number | null;
  received_at: string;
  captured_at: string;
  source: string;
  leg_id: string | null;
  reconstruction_id?: string | null;
};

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

export async function supabaseSelect<T>(path: string): Promise<T> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function supabaseSelectAll<T>(path: string, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let offset = 0; ; offset += pageSize) {
    const page = await supabaseSelect<T[]>(`${path}${separator}limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export function storedRowToPosition(row: StoredPositionRow, now = new Date()): VesselPosition {
  const vessel = fleetVessel(row.mmsi);
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(row.received_at)) / 1000));
  return {
    vesselName: vessel?.name ?? row.mmsi,
    mmsi: row.mmsi,
    imo: null,
    vesselType: 36,
    lat: row.latitude,
    lng: row.longitude,
    course: row.course,
    speedKnots: row.speed_knots,
    navigationStatus: row.navigation_status ?? 0,
    receivedAt: row.received_at,
    providerTimestamp: row.captured_at,
    ageSeconds,
    stale: ageSeconds > 15 * 60,
    provider: ["manual-user", "manual-reconstruction"].includes(row.source) ? "manual" : "supabase",
  };
}
