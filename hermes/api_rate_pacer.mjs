#!/usr/bin/env node

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const stateRoot = process.env.HERMES_HOME || "/opt/data";
const statePath = join(stateRoot, "api-rate-pacer.json");
const lockPath = join(stateRoot, ".api-rate-pacer.lock");
const windowMs = 60_000;
// Leave 80k TPM for compression, titles, retries, and other project traffic.
const tokenBudget = 120_000;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function acquireLock() {
  while (true) {
    try {
      const descriptor = openSync(lockPath, "wx", 0o600);
      closeSync(descriptor);
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 30_000) rmSync(lockPath);
      } catch (statError) {
        if (statError?.code !== "ENOENT") throw statError;
      }
      await sleep(50);
    }
  }
}

function loadEntries(now) {
  if (!existsSync(statePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) => Number.isFinite(entry?.at)
        && Number.isFinite(entry?.tokens)
        && entry.tokens > 0
        && now - entry.at < windowMs,
    );
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  const temporary = `${statePath}.${process.pid}.${Date.now()}`;
  writeFileSync(temporary, `${JSON.stringify(entries)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, statePath);
}

async function reserve(tokens) {
  mkdirSync(stateRoot, { recursive: true });
  while (true) {
    await acquireLock();
    let waitMs = 0;
    try {
      const now = Date.now();
      const entries = loadEntries(now);
      const used = entries.reduce((total, entry) => total + entry.tokens, 0);
      if (entries.length === 0 || used + tokens <= tokenBudget) {
        entries.push({ at: now, tokens });
        saveEntries(entries);
        return;
      }
      waitMs = Math.max(250, entries[0].at + windowMs - now + 250);
    } finally {
      rmSync(lockPath, { force: true });
    }
    await sleep(Math.min(waitMs, 5_000));
  }
}

const payload = JSON.parse(await readStdin());
const approximateTokens = Number(payload?.extra?.approx_input_tokens);
const requestedTokens = Number.isFinite(approximateTokens)
  ? Math.max(1_000, Math.ceil(approximateTokens))
  : 5_000;
await reserve(requestedTokens);

