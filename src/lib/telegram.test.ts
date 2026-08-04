import { describe, expect, it } from "vitest";
import {
  getTelegramConfig,
  hasValidTelegramSecret,
  isAllowedTelegramChat,
} from "./telegram";

describe("Telegram webhook security", () => {
  it("validates the webhook secret without accepting partial values", () => {
    expect(hasValidTelegramSecret("full-secret", "full-secret")).toBe(true);
    expect(hasValidTelegramSecret("full", "full-secret")).toBe(false);
    expect(hasValidTelegramSecret(null, "full-secret")).toBe(false);
  });

  it("accepts only allowlisted chats", () => {
    const allowed = new Set(["123", "-456"]);
    expect(isAllowedTelegramChat(123, allowed)).toBe(true);
    expect(isAllowedTelegramChat(-456, allowed)).toBe(true);
    expect(isAllowedTelegramChat(789, allowed)).toBe(false);
  });

  it("derives a valid secret and rejects empty allowlists", () => {
    const previous = { ...process.env };
    process.env.TELEGRAM_BOT_TOKEN = "123456:test_token";
    process.env.TELEGRAM_WEBHOOK_SECRET = "";
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = "123,-456";
    expect(getTelegramConfig()).toMatchObject({
      botToken: "123456:test_token",
      allowedChatIds: new Set(["123", "-456"]),
    });
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = "";
    expect(getTelegramConfig()).toBeUndefined();
    process.env = previous;
  });
});
