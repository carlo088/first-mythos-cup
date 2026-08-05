import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNC_KEYS,
  configureGitHubCredentialHelper,
  renderConfiguredModel,
  renderRuntimeDefaults,
} from "../bootstrap_gateway.mjs";

test("syncs the complete server environment into persistent Hermes state", () => {
  for (const key of [
    "MYSHIPTRACKING_API_KEY",
    "MYSHIPTRACKING_SECRET_KEY",
    "AISTREAM_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_DATABASE_URL",
    "SUPABASE_POOLER_HOST",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_PROJECT_REF",
  ]) {
    assert.equal(SYNC_KEYS.includes(key), true, `${key} must persist on Fly`);
  }
});

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
  assert.match(updated, /agent:\n  api_max_retries: 2/);
  assert.match(updated, /compression:\n  enabled: true\n  threshold: 0\.05/);
  assert.match(updated, /proactive_prune_tokens: 32000/);
  assert.match(updated, /proactive_prune_min_result_chars: 8000/);
  assert.match(updated, /proactive_prune_min_reclaim_tokens: 4096/);
  assert.match(updated, /hooks_auto_accept: true/);
  assert.match(updated, /hooks:\n  pre_api_request:\n    - command: \/opt\/hermes\/bin\/first-mythos-cup-api-pacer/);
  assert.match(updated, /quick_commands:\n  fresh:\n    type: alias\n    target: \/new --yes/);
  assert.match(updated, /platforms:\n  telegram:\n    enabled: true/);
});

test("adds proactive pruning to an existing compression section", () => {
  const config = `compression:\n  enabled: true\n  threshold: 0.05\n  protect_last_n: 20\n`;
  const updated = renderRuntimeDefaults(config);

  assert.match(updated, /protect_last_n: 12/);
  assert.match(updated, /proactive_prune_tokens: 32000/);
  assert.match(updated, /proactive_prune_min_result_chars: 8000/);
  assert.match(updated, /proactive_prune_min_reclaim_tokens: 4096/);
  assert.equal(renderRuntimeDefaults(updated), updated);
});

test("upgrades the fresh alias without replacing other persistent settings", () => {
  const config = `agent:\n  max_turns: 250\nquick_commands:\n  old_session:\n    type: alias\n    target: /new\n  fresh:\n    type: alias\n    target: /new\n  status:\n    type: exec\n    command: uptime\n`;
  const updated = renderRuntimeDefaults(config);

  assert.match(updated, /agent:\n  api_max_retries: 2\n  max_turns: 250/);
  assert.match(updated, /old_session:\n    type: alias\n    target: \/new\n/);
  assert.match(updated, /target: \/new --yes/);
  assert.match(updated, /command: uptime/);
  assert.equal(renderRuntimeDefaults(updated), updated);
});

test("preserves customized reset settings and existing quick commands", () => {
  const config = `session_reset:\n  mode: daily\n  at_hour: 3\nquick_commands:\n  status:\n    type: exec\n    command: uptime\n`;
  const updated = renderRuntimeDefaults(config);

  assert.match(updated, /mode: daily/);
  assert.match(updated, /command: uptime\n  fresh:/);
  assert.equal(renderRuntimeDefaults(updated), updated);
});

test("configures GitHub CLI as Git's credential helper without embedding the token", () => {
  const calls = [];
  const runner = (...args) => {
    calls.push(args);
    return { status: 0 };
  };

  assert.equal(configureGitHubCredentialHelper({ GITHUB_TOKEN: "test-token" }, runner), true);
  assert.deepEqual(calls[0][0], "gh");
  assert.deepEqual(calls[0][1], ["auth", "setup-git", "--hostname", "github.com"]);
  assert.equal(calls[0][1].includes("test-token"), false);
});
