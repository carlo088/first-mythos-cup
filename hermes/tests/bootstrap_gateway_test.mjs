import assert from "node:assert/strict";
import test from "node:test";

import { renderConfiguredModel } from "../bootstrap_gateway.mjs";

test("resolves an environment placeholder in the model section", () => {
  const config = `model:\n  provider: openai-api\n  default: \"\${HERMES_MODEL}\"\nagent:\n  max_turns: 250\n`;

  assert.equal(
    renderConfiguredModel(config, "gpt-5.6-luna"),
    "model:\n  provider: openai-api\n  default: gpt-5.6-luna\nagent:\n  max_turns: 250\n",
  );
});

test("preserves the rest of a persistent Hermes config", () => {
  const config = `model:\n  provider: openai-api\ngateway:\n  busy_input_mode: queue\nplatforms:\n  telegram:\n    enabled: true\n`;

  assert.equal(
    renderConfiguredModel(config, "gpt-5.6-luna"),
    "model:\n  provider: openai-api\n  default: gpt-5.6-luna\ngateway:\n  busy_input_mode: queue\nplatforms:\n  telegram:\n    enabled: true\n",
  );
});

test("rejects model values that are unsafe to place in YAML", () => {
  assert.throws(
    () => renderConfiguredModel("model:\n", "model\nsecurity: false"),
    /unsupported characters/,
  );
});
