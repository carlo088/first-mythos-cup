import { NextResponse } from "next/server";
import {
  getVesselPosition,
  VesselProviderError,
} from "@/lib/myshiptracking";
import { getMockVesselPosition } from "@/lib/mock-vessels";
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
    const useLiveProvider = process.env.VESSEL_DATA_MODE === "live";
    const position = useLiveProvider
      ? await getVesselPosition(mmsi)
      : getMockVesselPosition(mmsi);

    if (!position) {
      return NextResponse.json({ error: "Mock position unavailable." }, { status: 404 });
    }
    return NextResponse.json(
      { data: position },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
