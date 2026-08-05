export const MYSHIPTRACKING_ENDPOINT =
  "https://api.myshiptracking.com/api/v2/vessel";

interface MyShipTrackingSimpleData {
  vessel_name: string;
  mmsi: number;
  imo: number | null;
  vtype: number;
  lat: number;
  lng: number;
  course: number;
  speed: number;
  nav_status: number;
  received: string;
}

interface MyShipTrackingSimpleResponse {
  status: string;
  duration?: string;
  timestamp: string;
  data?: MyShipTrackingSimpleData;
  message?: string;
}

export interface VesselPosition {
  vesselName: string;
  mmsi: string;
  imo: number | null;
  vesselType: number;
  lat: number;
  lng: number;
  course: number | null;
  speedKnots: number;
  navigationStatus: number;
  receivedAt: string;
  providerTimestamp: string;
  ageSeconds: number;
  stale: boolean;
  provider: "myshiptracking" | "mock" | "supabase";
  /** Optional history point; mock mode derives one from course until this is populated. */
  previousPosition?: { lat: number; lng: number };
}

export class VesselProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = "VesselProviderError";
  }
}

export function normalizeSimpleResponse(
  response: MyShipTrackingSimpleResponse,
  now = new Date(),
): VesselPosition {
  if (response.status !== "success" || !response.data) {
    throw new VesselProviderError(
      response.message || "The vessel provider did not return position data.",
    );
  }

  const receivedMs = Date.parse(response.data.received);
  if (!Number.isFinite(receivedMs)) {
    throw new VesselProviderError("The vessel provider returned an invalid timestamp.");
  }

  const ageSeconds = Math.max(0, Math.floor((now.getTime() - receivedMs) / 1000));

  return {
    vesselName: response.data.vessel_name,
    mmsi: String(response.data.mmsi),
    imo: response.data.imo,
    vesselType: response.data.vtype,
    lat: response.data.lat,
    lng: response.data.lng,
    course: response.data.course === 511 ? null : response.data.course,
    speedKnots: response.data.speed,
    navigationStatus: response.data.nav_status,
    receivedAt: response.data.received,
    providerTimestamp: response.timestamp,
    ageSeconds,
    stale: ageSeconds > 15 * 60,
    provider: "myshiptracking",
  };
}

export async function getVesselPosition(mmsi: string): Promise<VesselPosition> {
  const apiKey = process.env.MYSHIPTRACKING_API_KEY;
  if (!apiKey) {
    throw new VesselProviderError("Vessel tracking is not configured.", 503);
  }

  const cacheSeconds = Math.max(
    60,
    Number.parseInt(process.env.VESSEL_CACHE_SECONDS || "60", 10) || 60,
  );
  const url = new URL(MYSHIPTRACKING_ENDPOINT);
  url.searchParams.set("mmsi", mmsi);
  url.searchParams.set("response", "simple");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "force-cache",
      next: { revalidate: cacheSeconds, tags: [`vessel-${mmsi}`] },
    });
  } catch {
    throw new VesselProviderError("The vessel provider is currently unreachable.");
  }

  if (!response.ok) {
    throw new VesselProviderError(
      `The vessel provider returned HTTP ${response.status}.`,
      response.status === 429 ? 429 : 502,
    );
  }

  let body: MyShipTrackingSimpleResponse;
  try {
    body = (await response.json()) as MyShipTrackingSimpleResponse;
  } catch {
    throw new VesselProviderError("The vessel provider returned invalid JSON.");
  }

  return normalizeSimpleResponse(body);
}
