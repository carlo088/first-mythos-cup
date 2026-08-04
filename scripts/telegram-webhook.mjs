import { createHmac } from "node:crypto";

const command = process.argv[2] || "status";
const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
  (botToken
    ? createHmac("sha256", botToken)
        .update("first-mythos-cup:telegram:webhook:v1")
        .digest("hex")
    : "");
const allowedChatIds = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const appUrl = (process.env.APP_URL || "https://first-mythos-cup.vercel.app").replace(/\/$/, "");

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN is missing from .env.local");
  process.exit(1);
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || `Telegram returned HTTP ${response.status}`);
  }
  return payload.result;
}

if (command === "register") {
  if (!webhookSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is missing from .env.local");
    process.exit(1);
  }
  if (allowedChatIds.length === 0) {
    console.error("TELEGRAM_ALLOWED_CHAT_IDS is missing from .env.local");
    process.exit(1);
  }

  const bot = await telegram("getMe", {});
  await telegram("setMyCommands", {
    commands: [
      { command: "status", description: "Check Hermes and vessel data status" },
      { command: "help", description: "Show available commands" },
    ],
  });
  await telegram("setWebhook", {
    url: `${appUrl}/api/telegram/webhook`,
    secret_token: webhookSecret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  console.log(JSON.stringify({
    registered: true,
    bot: bot.username,
    url: `${appUrl}/api/telegram/webhook`,
    allowedChatCount: allowedChatIds.length,
  }));
} else if (command === "discover") {
  const updates = await telegram("getUpdates", {
    timeout: 0,
    allowed_updates: ["message"],
  });
  const chats = new Map();
  for (const update of updates) {
    const message = update.message;
    if (!message?.chat) continue;
    chats.set(String(message.chat.id), {
      chatId: String(message.chat.id),
      type: message.chat.type,
      name: message.chat.title || message.chat.username || message.from?.username || message.from?.first_name || null,
    });
  }
  console.log(JSON.stringify({ chats: [...chats.values()] }));
} else if (command === "status") {
  const info = await telegram("getWebhookInfo", {});
  console.log(JSON.stringify({
    url: info.url,
    pendingUpdateCount: info.pending_update_count,
    lastErrorDate: info.last_error_date || null,
    lastErrorMessage: info.last_error_message || null,
  }));
} else {
  console.error("Use: telegram-webhook.mjs register|discover|status");
  process.exit(1);
}
