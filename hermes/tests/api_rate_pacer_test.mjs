import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptPath = new URL("../api_rate_pacer.mjs", import.meta.url);

test("reserves approximate request tokens without exposing request content", () => {
  const stateRoot = mkdtempSync(join(tmpdir(), "fmc-api-pacer-"));
  const payload = JSON.stringify({
    extra: { approx_input_tokens: 4321, conversation_history: "private content" },
  });
  const result = spawnSync(process.execPath, [scriptPath.pathname], {
    input: payload,
    encoding: "utf8",
    env: { ...process.env, HERMES_HOME: stateRoot },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  const state = JSON.parse(readFileSync(join(stateRoot, "api-rate-pacer.json"), "utf8"));
  assert.equal(state.length, 1);
  assert.equal(state[0].tokens, 4321);
  assert.equal(JSON.stringify(state).includes("private content"), false);
});
