#!/usr/bin/env node

import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const hermesHome = process.env.HERMES_HOME || "/opt/data";
const envPath = join(hermesHome, ".env");
const syncKeys = [
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "GFW_API_TOKEN",
  "APP_URL",
  "HERMES_MODEL",
  "VESSEL_DATA_MODE",
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

export function main() {
  persistEnvironment();
  mkdirSync(join(hermesHome, "workspace"), { recursive: true });
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
