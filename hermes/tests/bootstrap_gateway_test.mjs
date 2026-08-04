import assert from "node:assert/strict";
import test from "node:test";

import { renderConfiguredModel, renderRuntimeDefaults } from "../bootstrap_gateway.mjs";

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

test("adds the six-hour idle reset and fresh command without replacing persistent settings", () => {
  const config = `model:\n  default: gpt-5.6-luna\nplatforms:\n  telegram:\n    enabled: true\n`;
  const updated = renderRuntimeDefaults(config);

  assert.match(updated, /session_reset:\n  mode: idle\n  idle_minutes: 360/);
  assert.match(updated, /quick_commands:\n  fresh:\n    type: alias\n    target: \/new/);
  assert.match(updated, /platforms:\n  telegram:\n    enabled: true/);
});

test("preserves customized reset settings and existing quick commands", () => {
  const config = `session_reset:\n  mode: daily\n  at_hour: 3\nquick_commands:\n  status:\n    type: exec\n    command: uptime\n`;
  const updated = renderRuntimeDefaults(config);

  assert.match(updated, /mode: daily/);
  assert.match(updated, /command: uptime\n  fresh:/);
  assert.equal(renderRuntimeDefaults(updated), updated);
});
