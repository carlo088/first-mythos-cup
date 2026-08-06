import assert from "node:assert/strict";
import test from "node:test";
import { ingestionCadence, positionInsertQuery, shouldIngest } from "../vessel_ingestion_worker.mjs";

test("disables ingestion overnight in Greece", () => {
  assert.equal(ingestionCadence(new Date("2026-08-05T20:30:00Z"), true), null);
});

test("uses five-minute cadence during a daytime regatta", () => {
  assert.equal(ingestionCadence(new Date("2026-08-05T10:00:00Z"), true), 300000);
});

test("uses hourly cadence during the day outside regattas", () => {
  assert.equal(ingestionCadence(new Date("2026-08-05T10:00:00Z"), false), 3600000);
});

test("never ingests while mock mode is active", () => {
  assert.equal(shouldIngest({ now: new Date(), lastRunAt: null, activeRace: true, mode: "mock" }), false);
});
test("creates a new position row for every provider call", () => {
  const query = positionInsertQuery([
    { mmsi: "240576800", lat: 37.7, lng: 24.06, course: 511, speed: 0, nav_status: 5, received: "2026-08-06T18:25:23Z" },
  ], "2026-08-06T19:42:00Z");

  assert.match(query, /insert into public\.vessel_positions/);
  assert.doesNotMatch(query, /on conflict/);
  assert.match(query, /'2026-08-06T18:25:23Z'/);
  assert.match(query, /'2026-08-06T19:42:00Z'/);
});
