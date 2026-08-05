import assert from "node:assert/strict";
import test from "node:test";

import { assertTelegramId, parseAllowedUsers, updateAllowlist } from "../skills/first-mythos-cup/scripts/manage_telegram_allowlist.mjs";

test("normalizes a comma-separated Telegram allowlist", () => {
  assert.deepEqual(parseAllowedUsers("8421334634, 913093930,8421334634"), ["913093930", "8421334634"]);
});

test("rejects an invalid Telegram user ID", () => {
  assert.throws(() => assertTelegramId("*"), /5–20 digits/);
});

test("updates Fly only with the merged, validated allowlist", () => {
  const calls = [];
  const users = updateAllowlist("add", "913093930", ["8421334634"], (...args) => {
    calls.push(args);
    return { status: 0 };
  }, { FLY_API_TOKEN: "test-token" });

  assert.deepEqual(users, ["913093930", "8421334634"]);
  assert.equal(calls[0][0], "flyctl");
  assert.equal(calls[0][1].includes("TELEGRAM_ALLOWED_USERS=913093930,8421334634"), true);
  assert.equal(calls[0][2].env.FLY_ACCESS_TOKEN, "test-token");
});
