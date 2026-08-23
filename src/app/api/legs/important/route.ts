import { NextResponse } from "next/server";
import { computeLegResults, emptyTracks, orderResultsByScores, type ImportantLeg, type TrackPoint } from "@/lib/important-leg";
import { supabaseSelect, supabaseSelectAll, type StoredPositionRow } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegRow = {
  id: string; slug: string; name: string;
  start_latitude: number; start_longitude: number;
  end_latitude: number; end_longitude: number;
  checkpoint_latitude: number | null; checkpoint_longitude: number | null;
  checkpoint_2_latitude: number | null; checkpoint_2_longitude: number | null;
  starts_at: string; ends_at: string; corridor_meters: number;
  status: ImportantLeg["status"];
};
type LegScoreRow = { leg_id: string; mmsi: string; points: number };

function normalizeLeg(row: LegRow): ImportantLeg {
  return {
    id: row.id, slug: row.slug, name: row.name,
    start: { lat: row.start_latitude, lng: row.start_longitude },
    end: { lat: row.end_latitude, lng: row.end_longitude },
    checkpoints: [
      row.checkpoint_latitude === null || row.checkpoint_longitude === null
        ? null : { lat: row.checkpoint_latitude, lng: row.checkpoint_longitude },
      row.checkpoint_2_latitude === null || row.checkpoint_2_longitude === null
        ? null : { lat: row.checkpoint_2_latitude, lng: row.checkpoint_2_longitude },
    ].filter((checkpoint): checkpoint is { lat: number; lng: number } => checkpoint !== null),
    startsAt: row.starts_at, endsAt: row.ends_at,
    corridorMeters: row.corridor_meters, status: row.status,
  };
}

export async function GET() {
  try {
    const [legRows, manualRows, scoreRows] = await Promise.all([
      supabaseSelect<LegRow[]>("race_legs?select=*&order=starts_at.asc"),
      supabaseSelectAll<StoredPositionRow>("vessel_positions?source=eq.manual-reconstruction&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id,reconstruction_id&order=received_at.asc"),
      supabaseSelect<LegScoreRow[]>("leg_scores?select=leg_id,mmsi,points"),
    ]);
    const legs = legRows.map(normalizeLeg);
    const tracks = emptyTracks();
    const liveTracks = emptyTracks();
    for (const position of manualRows) {
      const legId = legs.find((leg) => {
        const receivedAt = Date.parse(position.received_at);
        return receivedAt >= Date.parse(leg.startsAt) && receivedAt <= Date.parse(leg.endsAt);
      })?.id ?? null;
      const point: TrackPoint = {
        id: position.id, mmsi: position.mmsi,
        lat: position.latitude, lng: position.longitude,
        course: position.course, speedKnots: position.speed_knots,
        receivedAt: position.received_at, legId,
      };
      const liveTrack = liveTracks.find((candidate) => candidate.mmsi === position.mmsi);
      if (liveTrack) liveTrack.points.push(point);
      if (legId) {
        const replayTrack = tracks.find((candidate) => candidate.mmsi === position.mmsi);
        if (replayTrack) replayTrack.points.push(point);
      }
    }
    for (const track of [...tracks, ...liveTracks]) {
      track.points.sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
    }
    const races = legs.map((leg) => {
      const scores = scoreRows.filter((score) => score.leg_id === leg.id);
      const computedResults = computeLegResults(leg, tracks);
      return {
        leg,
        results: scores.length > 0 ? orderResultsByScores(computedResults, scores) : computedResults,
        scores,
      };
    });
    return NextResponse.json({ data: { races, tracks, liveTracks } });
  } catch (error) {
    console.error("Unable to load race legs", error);
    return NextResponse.json({ error: "Unable to load race legs." }, { status: 503 });
  }
}
