import { describe, expect, it } from "vitest";
import { selectLivePositionRow, type LivePositionRow } from "./live-position-selection";

const providerRow = (received_at: string): LivePositionRow & Record<string, unknown> => ({
  id: 1,
  mmsi: "247520340",
  latitude: 37.6953,
  longitude: 24.06022,
  course: null,
  speed_knots: 0,
  navigation_status: 15,
  received_at,
  captured_at: received_at,
  source: "myshiptracking",
  leg_id: null,
});

const manualRow: LivePositionRow & Record<string, unknown> = {
  ...providerRow("2026-08-08T10:18:08Z"),
  id: 719,
  latitude: 37.521383333,
  longitude: 24.276816667,
  source: "manual-user",
};

describe("selectLivePositionRow", () => {
  it("uses the manual Isera position when MyShipTracking is stale", () => {
    const result = selectLivePositionRow(
      [providerRow("2026-07-21T08:39:30Z"), manualRow],
      new Date("2026-08-08T10:20:00Z"),
    );

    expect(result).toBe(manualRow);
  });

  it("keeps fresh MyShipTracking data ahead of an older manual position", () => {
    const freshProvider = providerRow("2026-08-08T10:10:00Z");
    const result = selectLivePositionRow(
      [freshProvider, manualRow],
      new Date("2026-08-08T10:20:00Z"),
    );

    expect(result).toBe(freshProvider);
  });

  it("selects fresh VesselAPI data", () => {
    const freshProvider = { ...providerRow("2026-08-08T10:10:00Z"), source: "vesselapi" };
    const result = selectLivePositionRow(
      [freshProvider, manualRow],
      new Date("2026-08-08T10:20:00Z"),
    );

    expect(result).toBe(freshProvider);
  });
});
