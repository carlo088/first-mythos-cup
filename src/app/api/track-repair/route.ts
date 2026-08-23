import { NextResponse } from "next/server";
import { isKnownMmsi } from "@/lib/vessels";
import { reconstructTrack, type ReconstructedPoint } from "@/lib/track-reconstruction";
import { supabaseSelectAll, type StoredPositionRow } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localOnly() {
  return process.env.NODE_ENV === "development";
}
function literal(value: string) { return `'${value.replaceAll("'", "''")}'`; }
function validIso(value: string | null) { return value && Number.isFinite(Date.parse(value)); }

export async function GET(request: Request) {
  if (!localOnly()) return NextResponse.json({ error: "Track repair is available on localhost only." }, { status: 403 });
  const url = new URL(request.url); const mmsi = url.searchParams.get("mmsi");
  const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  if (!mmsi || !isKnownMmsi(mmsi) || !validIso(from) || !validIso(to) || Date.parse(to!) <= Date.parse(from!)) return NextResponse.json({ error: "Invalid vessel or time range." }, { status: 400 });
  const rows = await supabaseSelectAll<StoredPositionRow>(`vessel_positions?mmsi=eq.${mmsi}&received_at=gte.${encodeURIComponent(from!)}&received_at=lte.${encodeURIComponent(to!)}&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id,reconstruction_id&order=received_at.asc`);
  return NextResponse.json({ data: rows });
}

export async function POST(request: Request) {
  if (!localOnly()) return NextResponse.json({ error: "Track repair is available on localhost only." }, { status: 403 });
  const body = await request.json().catch(() => null) as { mmsi?: string; startsAt?: string; endsAt?: string; controlPoints?: Array<{ lat: number; lng: number }>; note?: string } | null;
  if (!body?.mmsi || !isKnownMmsi(body.mmsi) || !body.startsAt || !body.endsAt || !Array.isArray(body.controlPoints) || body.controlPoints.length < 2 || body.controlPoints.length > 100 || body.controlPoints.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180)) return NextResponse.json({ error: "Invalid reconstruction." }, { status: 400 });
  let points: ReconstructedPoint[];
  try { points = reconstructTrack(body.controlPoints, body.startsAt, body.endsAt); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid reconstruction." }, { status: 400 }); }
  if (points.length > 5000) return NextResponse.json({ error: "The interval is too long. Repair one missing sailing interval at a time." }, { status: 400 });
  if (points.some((point) => point.speedKnots > 35)) return NextResponse.json({ error: "The route requires more than 35 knots. Adjust its time range or shape." }, { status: 400 });
  const projectRef = process.env.SUPABASE_PROJECT_REF; const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!projectRef || !token) return NextResponse.json({ error: "Supabase management access is not configured." }, { status: 503 });
  const id = crypto.randomUUID(); const captured = new Date().toISOString();
  const values = points.map((point) => `(${literal(body.mmsi!)},${point.lat},${point.lng},${point.course},${point.speedKnots},0,${literal(point.receivedAt)},${literal(captured)},'manual-reconstruction',${literal(id)})`).join(",");
  const query = `begin; insert into public.track_reconstructions(id,mmsi,starts_at,ends_at,control_points,note) values (${literal(id)},${literal(body.mmsi)},${literal(body.startsAt)},${literal(body.endsAt)},${literal(JSON.stringify(body.controlPoints))}::jsonb,${body.note ? literal(body.note.slice(0, 500)) : "null"}); insert into public.vessel_positions(mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,reconstruction_id) values ${values} on conflict (mmsi,received_at) do nothing; commit;`;
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Unable to save the reconstruction." }, { status: 502 });
  return NextResponse.json({ data: { reconstructionId: id, generated: points.length } });
}
