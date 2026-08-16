import assert from "node:assert/strict";
import test from "node:test";
import { greeceDateKey, ingestionCadence, positionInsertQuery, shouldIngest } from "../vessel_ingestion_worker.mjs";

test("disables ingestion overnight in Greece", () => {
  assert.equal(ingestionCadence(new Date("2026-08-05T20:30:00Z"), true), null);
});

test("uses five-minute cadence during a daytime regatta", () => {
  assert.equal(ingestionCadence(new Date("2026-08-05T10:00:00Z"), true), 300000);
});

test("uses 45-minute cadence during the day outside regattas", () => {
  assert.equal(ingestionCadence(new Date("2026-08-05T10:00:00Z"), false), 2700000);
});

test("always ingests once at 22:00 Greece time", () => {
  const tenPm = new Date("2026-08-05T19:00:00Z");
  assert.equal(shouldIngest({ now: tenPm, lastRunAt: new Date("2026-08-05T18:30:00Z"), activeRace: false, mode: "live" }), true);
  assert.equal(shouldIngest({ now: new Date("2026-08-05T19:04:00Z"), lastRunAt: tenPm, activeRace: false, mode: "live" }), false);
  assert.equal(greeceDateKey(tenPm), "2026-08-05");
});

test("never ingests while mock mode is active", () => {
  assert.equal(shouldIngest({ now: new Date(), lastRunAt: null, activeRace: true, mode: "mock" }), false);
});
test("upserts repeated provider reports by MMSI and received time", () => {
  const query = positionInsertQuery([
    { mmsi: "240576800", lat: 37.7, lng: 24.06, course: 511, speed: 0, nav_status: 5, received: "2026-08-06T18:25:23Z" },
  ], "2026-08-06T19:42:00Z");

  assert.match(query, /insert into public\.vessel_positions/);
  assert.match(query, /on conflict \(mmsi, received_at\) do update/i);
  assert.match(query, /'2026-08-06T18:25:23Z'/);
  assert.match(query, /'2026-08-06T19:42:00Z'/);
  assert.match(query, /'vesselapi'/);
});
