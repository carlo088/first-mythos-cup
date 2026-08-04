import { NextResponse } from "next/server";
import { answerWithHermes, HermesError } from "@/lib/hermes";
import {
  getTelegramConfig,
  hasValidTelegramSecret,
  isAllowedTelegramChat,
  sendTelegramMessage,
  type TelegramUpdate,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 60;

const HELP = `Hermes is the First Mythos Cup operations assistant.

Send a question about Isera, Fizzy, Tiamat, or the saved race snapshot.

Commands:
/status — service and vessel-data status
/help — show this message`;

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "hermes-telegram-webhook",
    configured: Boolean(getTelegramConfig()),
    vesselDataMode: process.env.VESSEL_DATA_MODE || "mock",
  });
}

export async function POST(request: Request) {
  const config = getTelegramConfig();
  if (!config) {
    return NextResponse.json({ error: "Telegram is not configured." }, { status: 503 });
  }

  if (
    !hasValidTelegramSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
      config.webhookSecret,
    )
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = update.message;
  if (!message?.text || message.from?.is_bot) {
    return NextResponse.json({ status: "ignored", updateId: update.update_id });
  }

  if (!isAllowedTelegramChat(message.chat.id, config.allowedChatIds)) {
    return NextResponse.json({ status: "ignored", updateId: update.update_id });
  }

  const input = message.text.trim();
  let reply: string;
  if (input === "/start" || input === "/help") {
    reply = HELP;
  } else if (input === "/status") {
    reply = "Hermes is operational on Vercel. Vessel data is a saved mock snapshot; no MyShipTracking calls are being made.";
  } else if (input.length > 4_000) {
    reply = "That message is too long. Please keep it under 4,000 characters.";
  } else {
    try {
      reply = (await answerWithHermes(input)).answer;
    } catch (error) {
      reply =
        error instanceof HermesError && error.statusCode === 429
          ? "Hermes is temporarily rate-limited. Please try again shortly."
          : "Hermes is temporarily unavailable. Please try again shortly.";
    }
  }

  try {
    await sendTelegramMessage(config, message, reply);
    return NextResponse.json({ status: "processed", updateId: update.update_id });
  } catch {
    // Acknowledge the update to avoid Telegram retrying it and spending twice.
    return NextResponse.json({ status: "delivery_failed", updateId: update.update_id });
  }
}

