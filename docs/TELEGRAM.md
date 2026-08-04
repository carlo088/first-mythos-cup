# Hermes Telegram deployment

## Architecture

Hermes runs inside the Vercel Next.js application. Telegram sends HTTPS webhook updates to:

`POST https://first-mythos-cup.vercel.app/api/telegram/webhook`

The webhook validates Telegram's secret header and the chat allowlist, invokes Hermes through `src/lib/hermes.ts`, then replies with Telegram's `sendMessage` method. Fly is not part of this webhook architecture.

## Required server variables

- `OPENAI_API_KEY`
- `HERMES_MODEL=gpt-5.6-luna`
- `VESSEL_DATA_MODE=mock`
- `APP_URL=https://first-mythos-cup.vercel.app`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_IDS` — comma-separated numeric chat IDs
- `TELEGRAM_WEBHOOK_SECRET` — optional; a safe value is derived from the bot token when omitted

Put values in `.env.local` and in Vercel Production. Never commit them.

## Registration

1. Create the bot with Telegram's `@BotFather` and put its token in `.env.local`.
2. Send the new bot a message from the permitted Telegram account.
3. Run `npm run telegram:discover` and copy the returned numeric chat ID into `TELEGRAM_ALLOWED_CHAT_IDS` locally and in Vercel Production.
4. Redeploy Vercel after changing variables.
5. Run `npm run telegram:register`.
6. Run `npm run telegram:status` and confirm the URL and zero pending errors.

## HTTP health

`GET /api/telegram/webhook` reports whether Telegram is configured without exposing secrets.

