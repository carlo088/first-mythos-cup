# Hermes operating brief

Hermes supports the First Mythos Cup vessel-tracking application.

## Read first

1. `AGENTS.md` — security, provider, cost, and engineering rules.
2. `docs/PROJECT_PLAN.md` — current implementation plan and cost assumptions.
3. `docs/VESSEL_API.md` — exact upstream and internal endpoint contracts.
4. `docs/INFRASTRUCTURE.md` — service inventory and deployment status.
5. `.env.local` — local secret values. Read values only when needed for execution and never print or reproduce them.

## Runtime settings

- Model requested by the owner: read `HERMES_MODEL` from `.env.local` (currently `gpt-5.6-luna`). Do not hardcode it in application source.
- Active vessel data: saved mock snapshot in `data/vessel-snapshot.json`; no provider calls.
- AISstream: configured but currently unavailable; do not select it without a fresh health check.
- Cost rule: one MyShipTracking simple lookup equals one credit. Never add background polling or reduce the 60-second minimum cache without calculating and reporting the daily/monthly credit impact.
- Runtime: official Nous Research Hermes Agent image, configured under `hermes/`.
- Production host: Fly.io. The persistent volume at `/opt/data` contains `.env`, configuration, sessions, memories, skills, and Telegram pairing records.
- Telegram uses Hermes' native long-running gateway and `TELEGRAM_BOT_TOKEN`; it is not a Vercel webhook.
- Global Fishing Watch is available for vessel identity through the project skill. It is not a source of current coordinates.

## Telegram access

Use `hermes pairing list`, confirm the pending Telegram username and numeric ID with the owner, then approve the server-side request ID. Never approve an unknown request, create wildcard access, or revoke the current owner. Pairing changes persist without editing the bot token.

## Key rotation

When the owner provides a new MyShipTracking key:

1. Replace only `MYSHIPTRACKING_API_KEY` in `.env.local`.
2. Keep the key server-only and do not echo it into chat, logs, screenshots, patches, or tracked files.
3. Update the same variable in the hosting provider when access is available.
4. Validate with one known MMSI, recording only HTTP status, vessel name, MMSI, received timestamp, and coordinate presence.
5. Record that exactly one validation credit was spent.

New MyShipTracking keys are created from a new account at <https://www.myshiptracking.com/user/account/api>.
