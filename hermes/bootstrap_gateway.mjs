#!/usr/bin/env node

import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const hermesHome = process.env.HERMES_HOME || "/opt/data";
const envPath = join(hermesHome, ".env");
const configPath = join(hermesHome, "config.yaml");
const workspacePath = join(hermesHome, "workspace");
const repositoryPath = join(workspacePath, "first-mythos-cup");
const syncKeys = [
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "GFW_API_TOKEN",
  "APP_URL",
  "HERMES_MODEL",
  "VESSEL_DATA_MODE",
  "GITHUB_TOKEN",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  "FLY_API_TOKEN",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
];
const seedOnceKeys = ["TELEGRAM_ALLOWED_USERS"];

export function parseEnv(text) {
  const lines = text.split(/\r?\n/);
  const values = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    values.set(line.slice(0, separator).trim(), line.slice(separator + 1));
  }
  return { lines, values };
}

export function quoteEnv(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")}"`;
}

export function renderConfiguredModel(config, model) {
  if (!/^[A-Za-z0-9._:/-]+$/.test(model)) {
    throw new Error("HERMES_MODEL contains unsupported characters.");
  }

  const lines = config.split(/\r?\n/);
  let inModelSection = false;
  let modelSectionIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^model:\s*(?:#.*)?$/.test(line)) {
      inModelSection = true;
      modelSectionIndex = index;
      continue;
    }
    if (inModelSection && /^\S/.test(line)) {
      lines.splice(index, 0, `  default: ${model}`);
      return lines.join("\n");
    }
    if (inModelSection && /^\s+default:\s*/.test(line)) {
      lines[index] = `${line.match(/^\s+/)?.[0] ?? "  "}default: ${model}`;
      return lines.join("\n");
    }
  }

  if (inModelSection) {
    lines.splice(modelSectionIndex + 1, 0, `  default: ${model}`);
    return lines.join("\n");
  }

  return `model:\n  default: ${model}\n${config}`;
}

export function renderRuntimeDefaults(config) {
  let updated = config;

  const ensureMappingEntry = (source, sectionName, key, value) => {
    const sectionMatch = source.match(new RegExp(`^${sectionName}:\\s*(?:#.*)?$`, "m"));
    if (!sectionMatch) {
      return `${source.trimEnd()}\n\n${sectionName}:\n  ${key}: ${value}\n`;
    }

    const sectionStart = (sectionMatch.index ?? 0) + sectionMatch[0].length;
    const remainder = source.slice(sectionStart);
    const nextSection = remainder.search(/^\\S/m);
    const sectionEnd = nextSection === -1 ? source.length : sectionStart + nextSection;
    const section = source.slice(sectionStart, sectionEnd);
    if (new RegExp(`^\\s+${key}:`, "m").test(section)) return source;

    return `${source.slice(0, sectionStart)}\n  ${key}: ${value}${source.slice(sectionStart)}`;
  };

  updated = ensureMappingEntry(updated, "agent", "api_max_retries", "2");

  if (!/^compression:\s*(?:#.*)?$/m.test(updated)) {
    updated = `${updated.trimEnd()}\n\ncompression:\n  enabled: true\n  threshold: 0.05\n  target_ratio: 0.20\n  protect_last_n: 20\n  protect_first_n: 0\n  hygiene_hard_message_limit: 100\n`;
  }

  if (!/^session_reset:\s*(?:#.*)?$/m.test(updated)) {
    updated = `${updated.trimEnd()}\n\nsession_reset:\n  mode: idle\n  idle_minutes: 360\n`;
  }

  const quickCommandsMatch = updated.match(/^quick_commands:\s*(?:#.*)?$/m);
  if (!quickCommandsMatch) {
    return `${updated.trimEnd()}\n\nquick_commands:\n  fresh:\n    type: alias\n    target: /new now\n`;
  }

  const sectionStart = (quickCommandsMatch.index ?? 0) + quickCommandsMatch[0].length;
  const remainder = updated.slice(sectionStart);
  const nextSection = remainder.search(/^\S/m);
  const sectionEnd = nextSection === -1 ? updated.length : sectionStart + nextSection;
  const section = updated.slice(sectionStart, sectionEnd);
  const freshMatch = section.match(/^  fresh:\s*(?:#.*)?$/m);
  if (freshMatch) {
    const freshStart = sectionStart + (freshMatch.index ?? 0);
    const freshRemainder = updated.slice(freshStart + freshMatch[0].length, sectionEnd);
    const nextCommand = freshRemainder.search(/^  \S/m);
    const freshEnd = nextCommand === -1
      ? sectionEnd
      : freshStart + freshMatch[0].length + nextCommand;
    const freshBlock = updated.slice(freshStart, freshEnd);
    const upgraded = freshBlock.replace(/(^\s+target:\s*["']?)\/new(["']?\s*$)/m, "$1/new now$2");
    return `${updated.slice(0, freshStart)}${upgraded}${updated.slice(freshEnd)}`;
  }

  return `${updated.slice(0, sectionEnd).trimEnd()}\n  fresh:\n    type: alias\n    target: /new now\n${updated.slice(sectionEnd)}`;
}

export function persistConfiguredModel(environment = process.env) {
  const model = environment.HERMES_MODEL;
  if (!existsSync(configPath)) return;
  const existing = readFileSync(configPath, "utf8");
  const withDefaults = renderRuntimeDefaults(existing);
  const updated = model ? renderConfiguredModel(withDefaults, model) : withDefaults;
  if (updated !== existing) writeFileSync(configPath, updated, { encoding: "utf8", mode: 0o600 });
}

export function persistEnvironment(environment = process.env) {
  mkdirSync(hermesHome, { recursive: true });
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const { lines, values } = parseEnv(existing);
  const updates = new Map();

  for (const key of syncKeys) {
    if (environment[key]) updates.set(key, environment[key]);
  }
  for (const key of seedOnceKeys) {
    if (environment[key] && !values.get(key)) updates.set(key, environment[key]);
  }
  if (updates.size === 0) return;

  const output = [];
  const replaced = new Set();
  for (const line of lines) {
    if (line.includes("=") && !line.trimStart().startsWith("#")) {
      const key = line.slice(0, line.indexOf("=")).trim();
      if (updates.has(key)) {
        output.push(`${key}=${quoteEnv(updates.get(key))}`);
        replaced.add(key);
        continue;
      }
    }
    output.push(line);
  }
  for (const [key, value] of updates) {
    if (!replaced.has(key)) output.push(`${key}=${quoteEnv(value)}`);
  }

  const payload = `${output.join("\n").trim()}\n`;
  const temporary = join(hermesHome, `.env.${process.pid}.${Date.now()}`);
  let descriptor;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, payload, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, envPath);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function configureGitHubCredentialHelper(environment = process.env, runner = spawnSync) {
  if (!environment.GITHUB_TOKEN) return true;
  const configured = runner(
    "gh",
    ["auth", "setup-git", "--hostname", "github.com"],
    { stdio: "inherit", env: environment },
  );
  if (configured.status !== 0) {
    console.error("GitHub credential helper setup failed; Git pushes may require manual repair.");
    return false;
  }
  return true;
}

export function main() {
  persistEnvironment();
  persistConfiguredModel();
  configureGitHubCredentialHelper();
  mkdirSync(workspacePath, { recursive: true });
  if (!existsSync(join(repositoryPath, ".git"))) {
    const clone = spawnSync(
      "git",
      ["clone", "--branch", "main", "--single-branch", "https://github.com/carlo088/first-mythos-cup.git", repositoryPath],
      { stdio: "inherit" },
    );
    if (clone.status !== 0) console.error("Repository bootstrap failed; Hermes will retry on its next restart.");
  }
  const child = spawn("hermes", ["gateway", "run"], { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (error) => {
    console.error(`Unable to start Hermes gateway: ${error.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
