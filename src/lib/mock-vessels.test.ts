import { describe, expect, it } from "vitest";
import { getMockVesselPosition } from "./mock-vessels";

describe("saved vessel snapshot", () => {
  it("returns Fizzy without a live provider call", () => {
    const position = getMockVesselPosition(
      "240576800",
      new Date("2026-08-04T21:20:00Z"),
    );
    expect(position).toMatchObject({
      vesselName: "FIZZY",
      lat: 37.69558,
      lng: 24.05911,
      provider: "mock",
      stale: true,
    });
  });
});

