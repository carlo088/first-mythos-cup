import snapshot from "../../data/vessel-snapshot.json";
import type { VesselPosition } from "./myshiptracking";

export function getMockVesselPosition(
  mmsi: string,
  now = new Date(),
): VesselPosition | undefined {
  const vessel = snapshot.vessels.find((item) => item.mmsi === mmsi);
  if (!vessel) return undefined;

  const ageSeconds = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(vessel.receivedAt)) / 1000),
  );

  return {
    ...vessel,
    providerTimestamp: snapshot.capturedAt,
    ageSeconds,
    stale: true,
    provider: "mock",
  };
}

