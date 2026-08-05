import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPublishableCheckout,
  selectDeployment,
} from "../skills/first-mythos-cup/scripts/publish_web.mjs";

test("selects the Vercel deployment for the exact Git commit", () => {
  const deployments = [
    { uid: "old", meta: { githubCommitSha: "abc" } },
    { uid: "current", meta: { githubCommitSha: "def" } },
  ];
  assert.equal(selectDeployment(deployments, "def")?.uid, "current");
  assert.equal(selectDeployment(deployments, "missing"), null);
});

test("publishes only a clean main checkout", () => {
  assert.doesNotThrow(() => assertPublishableCheckout("", "main"));
  assert.throws(() => assertPublishableCheckout(" M file", "main"), /dirty/);
  assert.throws(() => assertPublishableCheckout("", "feature"), /expected main/);
});
