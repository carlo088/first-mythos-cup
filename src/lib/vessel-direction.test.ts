import { describe, expect, it } from "vitest";
import { getVesselTrack, initialBearing } from "./vessel-direction";

const current = { lat: 37.8, lng: 23.9 };

describe("vessel direction", () => {
  it("uses a real previous position when one is available", () => {
    const previous = { lat: 37.79, lng: 23.9 };

    expect(getVesselTrack({ ...current, course: 90, previousPosition: previous })).toEqual({
      previous,
      current,
      bearing: 0,
      mocked: false,
    });
  });

  it("mocks the previous position behind the current course until history is available", () => {
    const track = getVesselTrack({ ...current, course: 90 });

    expect(track.mocked).toBe(true);
    expect(track.bearing).toBeCloseTo(90, 1);
    expect(track.previous.lat).toBeCloseTo(current.lat, 2);
    expect(track.previous.lng).toBeLessThan(current.lng);
  });

  it("calculates a bearing from previous to current", () => {
    expect(initialBearing({ lat: 37.8, lng: 23.9 }, { lat: 37.8, lng: 24.0 })).toBeCloseTo(90, 1);
  });
});
