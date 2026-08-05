import { NextResponse } from "next/server";
import { isKnownMmsi } from "@/lib/vessels";

export const runtime = "nodejs";

function sqlLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Score editing requires the future race-admin authentication flow." }, { status: 403 });
  }
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!projectRef || !accessToken) return NextResponse.json({ error: "Score editing is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { legId?: string; mmsi?: string; points?: number } | null;
  if (!body || !body.legId || !/^[0-9a-f-]{36}$/i.test(body.legId) || !body.mmsi || !isKnownMmsi(body.mmsi)
    || !Number.isInteger(body.points) || body.points! < 0 || body.points! > 100) {
    return NextResponse.json({ error: "Invalid score." }, { status: 400 });
  }
  const query = `insert into public.leg_scores (leg_id, mmsi, points, updated_at) values (${sqlLiteral(body.legId)}, ${sqlLiteral(body.mmsi)}, ${body.points}, now()) on conflict (leg_id, mmsi) do update set points=excluded.points, updated_at=now();`;
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to save score." }, { status: 502 });
  return NextResponse.json({ data: { saved: true } });
}
