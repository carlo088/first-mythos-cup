import { createHmac, timingSafeEqual } from "node:crypto";

const TELEGRAM_API_ROOT = "https://api.telegram.org";

export interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: { id: number; type: string };
  from?: { id: number; is_bot?: boolean; first_name?: string; username?: string };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramConfig {
  botToken: string;
  webhookSecret: string;
  allowedChatIds: Set<string>;
}

export class TelegramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramError";
  }
}

export function getTelegramConfig(): TelegramConfig | undefined {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken || !/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) return undefined;
  const webhookSecret =
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    createHmac("sha256", botToken)
      .update("first-mythos-cup:telegram:webhook:v1")
      .digest("hex");
  const allowedChatIds = new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^-?\d+$/.test(value)),
  );

  if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret) || allowedChatIds.size === 0) {
    return undefined;
  }
  return { botToken, webhookSecret, allowedChatIds };
}

export function hasValidTelegramSecret(
  supplied: string | null,
  expected: string,
): boolean {
  if (!supplied) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

export function isAllowedTelegramChat(
  chatId: number,
  allowedChatIds: Set<string>,
): boolean {
  return allowedChatIds.has(String(chatId));
}

async function telegramMethod<T>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${TELEGRAM_API_ROOT}/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TelegramError("Telegram is currently unreachable.");
  }

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: T;
    description?: string;
  };
  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new TelegramError(
      payload.description || `Telegram returned HTTP ${response.status}.`,
    );
  }
  return payload.result;
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  message: TelegramMessage,
  text: string,
): Promise<void> {
  await telegramMethod(config.botToken, "sendMessage", {
    chat_id: message.chat.id,
    text: text.slice(0, 4_000),
    reply_parameters: { message_id: message.message_id },
  });
}
