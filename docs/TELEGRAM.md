# Hermes native Telegram gateway

## Architecture

Telegram connects directly to the official, always-on Hermes Agent gateway on
Fly.io. No Vercel webhook is involved. Sessions, memories, skills, and pairing
records persist on the Fly volume mounted at `/opt/data`.

## Required secrets

- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USERS` — initially the owner's numeric Telegram user ID

`HERMES_MODEL=gpt-5.6-luna` is non-secret configuration. Local values live in
the ignored `.env.local`; production values live in Fly secrets. The Hermes
bootstrap copies required secrets into protected `/opt/data/.env` without
printing them.

## First connection

1. Create the bot with Telegram's `@BotFather` and add its token to
   `TELEGRAM_BOT_TOKEN` in `.env.local`.
2. Obtain the owner's numeric Telegram user ID and add it to
   `TELEGRAM_ALLOWED_USERS`.
3. Deploy `fly.toml`. Hermes starts `gateway run` and connects using long
   polling; no public Fly port or Telegram webhook registration is required.
4. Message the bot from the owner account and verify a reply in Fly logs.

## Adding users safely

An unknown user messages the bot and receives a pairing code. The owner can ask
Hermes to add that user. Hermes must run `hermes pairing list`, show the exact
pending Telegram username and numeric ID, and receive explicit owner
confirmation before running:

```bash
hermes pairing approve telegram REQUEST_ID
```

Revocation also requires explicit owner confirmation:

```bash
hermes pairing revoke telegram USER_ID
```

Never allow `*`, never approve an unmatched request, and never reveal the bot
token. Pairing approvals are stored on the persistent volume and do not require
a gateway restart.
