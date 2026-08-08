import { NextResponse } from "next/server";
import { computeLegResults, emptyTracks, type ImportantLeg, type TrackPoint } from "@/lib/important-leg";
import { supabaseSelect, type StoredPositionRow } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegRow = {
  id: string; slug: string; name: string;
  start_latitude: number; start_longitude: number;
  end_latitude: number; end_longitude: number;
  starts_at: string; ends_at: string; corridor_meters: number;
  status: ImportantLeg["status"];
};
type LegScoreRow = { leg_id: string; mmsi: string; points: number };

function normalizeLeg(row: LegRow): ImportantLeg {
  return {
    id: row.id, slug: row.slug, name: row.name,
    start: { lat: row.start_latitude, lng: row.start_longitude },
    end: { lat: row.end_latitude, lng: row.end_longitude },
    startsAt: row.starts_at, endsAt: row.ends_at,
    corridorMeters: row.corridor_meters, status: row.status,
  };
}

export async function GET() {
  try {
    const [legRows, rows, liveRows, scoreRows] = await Promise.all([
      supabaseSelect<LegRow[]>("race_legs?select=*&order=starts_at.asc"),
      supabaseSelect<StoredPositionRow[]>("vessel_positions?source=eq.important-leg-simulation&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id&order=received_at.asc"),
      supabaseSelect<StoredPositionRow[]>("vessel_positions?source=not.eq.important-leg-simulation&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id&order=received_at.asc"),
      supabaseSelect<LegScoreRow[]>("leg_scores?select=leg_id,mmsi,points"),
    ]);
    const legs = legRows.map(normalizeLeg);
    const tracks = emptyTracks();
    const liveTracks = emptyTracks();
    for (const position of rows) {
      const track = tracks.find((candidate) => candidate.mmsi === position.mmsi);
      if (!track) continue;
      const point: TrackPoint = {
        id: position.id, mmsi: position.mmsi,
        lat: position.latitude, lng: position.longitude,
        course: position.course, speedKnots: position.speed_knots,
        receivedAt: position.received_at, legId: position.leg_id,
      };
      track.points.push(point);
    }
    for (const position of liveRows) {
      const track = liveTracks.find((candidate) => candidate.mmsi === position.mmsi);
      if (!track) continue;
      track.points.push({
        id: position.id, mmsi: position.mmsi,
        lat: position.latitude, lng: position.longitude,
        course: position.course, speedKnots: position.speed_knots,
        receivedAt: position.received_at, legId: null,
      });
    }
    const races = legs.map((leg) => ({
      leg,
      results: computeLegResults(leg, tracks),
      scores: scoreRows.filter((score) => score.leg_id === leg.id),
    }));
    return NextResponse.json({ data: { races, tracks, liveTracks } });
  } catch (error) {
    console.error("Unable to load race legs", error);
    return NextResponse.json({ error: "Unable to load race legs." }, { status: 503 });
  }
}
