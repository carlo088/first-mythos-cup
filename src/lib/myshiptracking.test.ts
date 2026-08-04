import { describe, expect, it } from "vitest";
import { normalizeSimpleResponse } from "./myshiptracking";

const response = {
  status: "success",
  timestamp: "2026-08-04T20:38:37.295Z",
  data: {
    vessel_name: "FIZZY",
    mmsi: 240576800,
    imo: null,
    vtype: 9,
    lat: 37.69558,
    lng: 24.05911,
    course: 511,
    speed: 0,
    nav_status: 5,
    received: "2026-08-04T19:19:23Z",
  },
};

describe("normalizeSimpleResponse", () => {
  it("normalizes unavailable course and calculates data age", () => {
    const result = normalizeSimpleResponse(response, new Date("2026-08-04T20:19:23Z"));
    expect(result.course).toBeNull();
    expect(result.ageSeconds).toBe(3600);
    expect(result.stale).toBe(true);
    expect(result.mmsi).toBe("240576800");
  });
});

