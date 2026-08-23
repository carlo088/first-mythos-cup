import { describe, expect, it } from "vitest";
import { PUBLIC_TRACK_FILTERS, publicPositionSourceFilter } from "./public-position-source";

describe("public position source policy", () => {
  it("uses AIS provider rows for Tiamat", () => {
    expect(publicPositionSourceFilter("240608700")).toBe("source=in.(myshiptracking,vesselapi)");
    expect(PUBLIC_TRACK_FILTERS[1]).not.toContain("manual");
  });

  it("keeps Isera and Fizzy on audited reconstruction rows", () => {
    expect(publicPositionSourceFilter("247520340")).toBe("source=eq.manual-reconstruction");
    expect(publicPositionSourceFilter("240576800")).toBe("source=eq.manual-reconstruction");
  });
});
