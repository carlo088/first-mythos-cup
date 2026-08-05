#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const APP_NAME = "first-mythos-cup-hermes";
const ENV_PATH = join(process.env.HERMES_HOME || "/opt/data", ".env");

export function parseAllowedUsers(value = "") {
  return [...new Set(value.split(/[\s,]+/).filter(Boolean))].sort((left, right) => Number(left) - Number(right));
}

export function assertTelegramId(value) {
  if (!/^\d{5,20}$/.test(value)) throw new Error("Telegram user ID must contain 5–20 digits.");
  return value;
}

export function readAllowedUsers(environment = process.env) {
  const fromEnvironment = environment.TELEGRAM_ALLOWED_USERS;
  const source = fromEnvironment || (existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").match(/^TELEGRAM_ALLOWED_USERS=(.*)$/m)?.[1] ?? "" : "");
  return parseAllowedUsers(source.replace(/^['"]|['"]$/g, ""));
}

function usage() {
  console.error("Usage: manage_telegram_allowlist.mjs list | add TELEGRAM_ID [--notify-chat-id OWNER_CHAT_ID] | remove TELEGRAM_ID");
  process.exitCode = 2;
}

function notifyChatId(argumentsList) {
  const flagIndex = argumentsList.indexOf("--notify-chat-id");
  if (flagIndex === -1) return null;
  const value = argumentsList[flagIndex + 1];
  if (!value || !/^\d{5,20}$/.test(value)) throw new Error("Notification chat ID must contain 5–20 digits.");
  return value;
}

async function notifyBeforeRestart(chatId, action, telegramId, environment = process.env) {
  if (!chatId || !environment.TELEGRAM_BOT_TOKEN) return;
  const message = `Telegram access ${action === "add" ? "approved" : "revoked"} for ${telegramId}. Eolo is updating its allowlist and will reconnect shortly; no further action is needed.`;
  try {
    const response = await fetch(`https://api.telegram.org/bot${environment.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!response.ok) console.error("Pre-restart Telegram notification failed; continuing with allowlist update.");
  } catch {
    console.error("Pre-restart Telegram notification failed; continuing with allowlist update.");
  }
}

export function updateAllowlist(action, telegramId, currentUsers, runner = spawnSync, environment = process.env) {
  const nextUsers = action === "add"
    ? [...new Set([...currentUsers, telegramId])]
    : currentUsers.filter((id) => id !== telegramId);

  if (action === "remove" && nextUsers.length === 0) throw new Error("Refusing to remove the final allowed Telegram user.");
  const nextValue = nextUsers.sort((left, right) => Number(left) - Number(right)).join(",");
  const childEnvironment = { ...environment, FLY_ACCESS_TOKEN: environment.FLY_ACCESS_TOKEN || environment.FLY_API_TOKEN };
  const result = runner("flyctl", ["secrets", "set", `TELEGRAM_ALLOWED_USERS=${nextValue}`, "--app", APP_NAME], {
    stdio: "inherit",
    env: childEnvironment,
  });
  if (result.status !== 0) throw new Error("Fly allowlist update failed; no access change was confirmed.");
  return nextUsers;
}

export async function main(argumentsList = process.argv.slice(2)) {
  const [action, rawTelegramId] = argumentsList;
  if (action === "list" && !rawTelegramId) {
    console.log(JSON.stringify({ allowedUserIds: readAllowedUsers() }));
    return;
  }
  if (!(["add", "remove"].includes(action) && rawTelegramId)) return usage();

  const telegramId = assertTelegramId(rawTelegramId);
  const currentUsers = readAllowedUsers();
  if (action === "add" && currentUsers.includes(telegramId)) {
    console.log(`Telegram user ${telegramId} is already allowed.`);
    return;
  }
  if (action === "remove" && !currentUsers.includes(telegramId)) {
    console.log(`Telegram user ${telegramId} is not allowed.`);
    return;
  }
  await notifyBeforeRestart(notifyChatId(argumentsList), action, telegramId);
  const nextUsers = updateAllowlist(action, telegramId, currentUsers);
  console.log(`Telegram user ${telegramId} ${action === "add" ? "added to" : "removed from"} the allowlist. The gateway will restart.`);
  console.log(JSON.stringify({ allowedUserIds: nextUsers }));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
