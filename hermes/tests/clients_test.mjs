import test from "node:test";
import assert from "node:assert/strict";

import { resolveUrl, searchUrl } from "../skills/first-mythos-cup/scripts/gfw_vessels.mjs";
import { normalizePayload, validatePaidRequest } from "../skills/first-mythos-cup/scripts/myshiptracking_vessel.mjs";

test("GFW search includes the required dataset", () => {
  const url = new URL(searchUrl("240576800", 10));
  assert.equal(url.searchParams.get("query"), "240576800");
  assert.equal(url.searchParams.get("datasets[0]"), "public-global-vessel-identity:latest");
  assert.equal(url.searchParams.get("limit"), "10");
});

test("GFW rejects invalid limits", () => assert.throws(() => searchUrl("FIZZY", 51)));
test("GFW rejects control characters", () => assert.throws(() => searchUrl("FIZZY\nAuthorization: secret", 10)));

test("GFW resolve includes the required dataset", () => {
  const url = new URL(resolveUrl("772ea0b5-d364"));
  assert.equal(url.searchParams.get("dataset"), "public-global-vessel-identity:latest");
});

test("MyShipTracking requires credit acknowledgement", () => {
  assert.throws(() => validatePaidRequest("240576800", false));
});

test("MyShipTracking rejects non-fleet MMSIs", () => {
  assert.throws(() => validatePaidRequest("123456789", true));
});

test("MyShipTracking normalizes course 511", () => {
  assert.equal(normalizePayload({ status: "success", data: { course: 511 } }).data.course, null);
});
