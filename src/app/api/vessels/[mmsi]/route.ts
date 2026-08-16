import { NextResponse } from "next/server";
import { VesselProviderError } from "@/lib/myshiptracking";
import { storedRowToPosition, selectLivePositionRow, supabaseSelect, type StoredPositionRow } from "@/lib/supabase-rest";
import { isKnownMmsi } from "@/lib/vessels";

export const runtime = "nodejs";

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
    let row: StoredPositionRow | undefined;
    let providerRows: StoredPositionRow[] = [];
    if (process.env.VESSEL_DATA_MODE === "live") {
      providerRows = await supabaseSelect<StoredPositionRow[]>(
        `vessel_positions?mmsi=eq.${mmsi}&source=eq.vesselapi&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id&order=captured_at.desc&limit=2`,
      );
      const manualRows = mmsi === "247520340"
        ? await supabaseSelect<StoredPositionRow[]>(
          `vessel_positions?mmsi=eq.${mmsi}&source=eq.manual-user&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id&order=captured_at.desc&limit=1`,
        )
        : [];
      row = selectLivePositionRow([...providerRows, ...manualRows]);
    } else {
      const rows = await supabaseSelect<StoredPositionRow[]>(
        `vessel_positions?mmsi=eq.${mmsi}&select=id,mmsi,latitude,longitude,course,speed_knots,navigation_status,received_at,captured_at,source,leg_id&order=captured_at.desc&limit=1`,
      );
      row = rows[0];
    }
    if (!row) return NextResponse.json({ error: "Position unavailable." }, { status: 404 });
    const position = storedRowToPosition(row);
    if (row.source === "manual-user" && providerRows?.[0]) {
      position.previousPosition = {
        lat: providerRows[0].latitude,
        lng: providerRows[0].longitude,
      };
    }
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
