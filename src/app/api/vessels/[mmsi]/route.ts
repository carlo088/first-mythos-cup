import { NextResponse } from "next/server";
import { VesselProviderError } from "@/lib/myshiptracking";
import { publicPositionSourceFilter } from "@/lib/public-position-source";
import { storedRowToPosition, supabaseSelect, type StoredPositionRow } from "@/lib/supabase-rest";
import { isKnownMmsi } from "@/lib/vessels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ mmsi: string }> },
) {
  const { mmsi } = await context.params;

  if (!isKnownMmsi(mmsi)) {
    return NextResponse.json(
      { error: "Unknown vessel MMSI." },
      { status: 404 },
    );
  }

  try {
    const rows = await supabaseSelect<StoredPositionRow[]>(
      `vessel_positions?mmsi=eq.${mmsi}&${publicPositionSourceFilter(mmsi)}&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id,reconstruction_id&order=received_at.desc&limit=1`,
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Position unavailable." }, { status: 404 });
    const position = storedRowToPosition(row);
    return NextResponse.json(
      { data: position },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const providerError =
      error instanceof VesselProviderError
        ? error
        : new VesselProviderError("Unable to load the vessel position.");

    return NextResponse.json(
      { error: providerError.message },
      { status: providerError.statusCode },
    );
  }
}
