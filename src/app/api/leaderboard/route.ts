import { NextResponse } from "next/server";
import { FLEET } from "@/lib/vessels";
import { sortLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

type ScoreRow = { mmsi: string; total_points: number };

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 503 });
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/vessel_scores?select=mmsi,total_points`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);

    const rows = (await response.json()) as ScoreRow[];
    const scores = new Map(rows.map((row) => [row.mmsi, row.total_points]));
    const leaderboard: LeaderboardEntry[] = FLEET.map((vessel) => ({
      ...vessel,
      totalPoints: scores.get(vessel.mmsi) ?? 0,
    }));
    return NextResponse.json({ data: sortLeaderboard(leaderboard) });
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 502 });
  }
}
