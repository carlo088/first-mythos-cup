import { describe, expect, it } from "vitest";
import {
  computeLegResults,
  decimalDegrees,
  formatElapsed,
  PRIMA_REGATINA_ROUTE,
  replayPoint,
  replayTimeline,
  type ImportantLeg,
  type LegTrack,
} from "./important-leg";

const leg: ImportantLeg = {
  id: "leg-1",
  slug: "prima-regatina",
  name: "Prima Regatina",
  start: PRIMA_REGATINA_ROUTE.start,
  end: PRIMA_REGATINA_ROUTE.end,
  checkpoints: [],
  startsAt: "2026-08-05T18:00:00.000Z",
  endsAt: "2026-08-05T18:30:00.000Z",
  corridorMeters: 1800,
  status: "finished",
};

function track(name: string, mmsi: string, finishMinute: number): LegTrack {
  return { name, mmsi, color: "#000", points: [{
    id: finishMinute, mmsi, ...leg.end, course: 320, speedKnots: 20,
    receivedAt: `2026-08-05T18:${String(finishMinute).padStart(2, "0")}:00.000Z`, legId: leg.id,
  }] };
}

describe("important leg", () => {
  it("converts degrees and minutes", () => {
    expect(decimalDegrees(37, 27.015)).toBeCloseTo(37.45025, 6);
  });

  it("orders finishers by elapsed time", () => {
    const results = computeLegResults(leg, [track("Second", "2", 29), track("First", "1", 27)]);
    expect(results.map((result) => result.name)).toEqual(["First", "Second"]);
    expect(results[0].elapsedSeconds).toBe(1620);
  });

  it("formats sub-hour elapsed times", () => {
    expect(formatElapsed(1620)).toBe("27:00");
  });

  it("starts replay at the leg start and then advances chronologically", () => {
    const track: LegTrack = {
      name: "Boat", mmsi: "1", color: "#000", points: [
        { id: 3, mmsi: "1", lat: 3, lng: 3, course: 0, speedKnots: 1, receivedAt: "2026-08-05T18:20:00.000Z", legId: leg.id },
        { id: 1, mmsi: "1", lat: 1, lng: 1, course: 0, speedKnots: 1, receivedAt: "2026-08-05T18:05:00.000Z", legId: leg.id },
      ],
    };
    expect(replayTimeline(leg, [track])).toEqual([
      leg.startsAt,
      "2026-08-05T18:05:00.000Z",
      "2026-08-05T18:20:00.000Z",
    ]);
    expect(replayPoint(track, leg.id, leg.startsAt)?.id).toBe(1);
    expect(replayPoint(track, leg.id, "2026-08-05T18:20:00.000Z")?.id).toBe(3);
  });
});
