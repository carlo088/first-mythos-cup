import { describe, expect, it } from "vitest";
import { reconstructTrack } from "./track-reconstruction";

describe("reconstructTrack", () => {
  it("assigns five-minute timestamps and preserves endpoints", () => {
    const points = reconstructTrack([{ lat: 37, lng: 24 }, { lat: 37.1, lng: 24.1 }], "2026-08-20T10:00:00Z", "2026-08-20T10:12:00Z");
    expect(points.map((point) => point.receivedAt)).toEqual(["2026-08-20T10:00:00.000Z", "2026-08-20T10:05:00.000Z", "2026-08-20T10:10:00.000Z", "2026-08-20T10:12:00.000Z"]);
    expect(points[0]).toMatchObject({ lat: 37, lng: 24 });
    expect(points.at(-1)).toMatchObject({ lat: 37.1, lng: 24.1 });
  });
});
