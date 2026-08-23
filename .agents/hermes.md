# Hermes operating brief

Hermes supports the First Mythos Cup vessel-tracking application.

## Read first

1. `AGENTS.md` — security, provider, cost, and engineering rules.
2. `docs/PROJECT_PLAN.md` — current implementation plan and cost assumptions.
3. `docs/IMPORTANT_LEG_TEST.md` — Prima Regatina simulation, database pipeline, and replay verification.
4. `docs/VESSEL_API.md` — exact upstream and internal endpoint contracts.
5. `docs/INFRASTRUCTURE.md` — service inventory and deployment status.
6. `.env.local` — local secret values. Read values only when needed for execution and never print or reproduce them.

## Runtime settings

- Model requested by the owner: read `HERMES_MODEL` from `.env.local` (currently `gpt-5.6-luna`). Do not hardcode it in application source.
- Active vessel data: Supabase `vessel_positions`; the current rows come from the Prima Regatina simulator and make no paid provider calls. Frontends must never add a mock-only read path.
- Scheduled writer: vessel tracking is retired after the cup and `VESSEL_DATA_MODE=disabled` prevents the Fly gateway from starting `/opt/hermes/bin/first-mythos-cup-vessel-worker`. Do not restart ingestion or make vessel-provider calls unless the owner explicitly asks to reactivate tracking and acknowledges the cost.
- AISstream: configured but currently unavailable; do not select it without a fresh health check.
- Cost rule: one MyShipTracking simple lookup equals one credit. Never add background polling or reduce the 60-second minimum cache without calculating and reporting the daily/monthly credit impact.
- Runtime: official Nous Research Hermes Agent image, configured under `hermes/`.
- Production host: Fly.io. The persistent volume at `/opt/data` contains `.env`, configuration, sessions, memories, and skills.
- Telegram uses Hermes' native long-running gateway and `TELEGRAM_BOT_TOKEN`; it is not a Vercel webhook.
- Global Fishing Watch is available for vessel identity through the project skill. It is not a source of current coordinates.

## Telegram access

The Telegram adapter blocks unknown users before Hermes pairing can run. Manage
the protected `TELEGRAM_ALLOWED_USERS` Fly allowlist with the project skill's
`manage_telegram_allowlist.mjs` script. First obtain and show the candidate's
exact username and numeric ID, then require explicit owner confirmation before
adding or removing anyone. Never use a wildcard or remove the current owner.

## Key rotation

When the owner provides a new MyShipTracking key:

1. Replace only `MYSHIPTRACKING_API_KEY` in `.env.local`.
2. Keep the key server-only and do not echo it into chat, logs, screenshots, patches, or tracked files.
3. Update the same variable in the hosting provider when access is available.
4. Validate with one known MMSI, recording only HTTP status, vessel name, MMSI, received timestamp, and coordinate presence.
5. Record that exactly one validation credit was spent.

New MyShipTracking keys are created from a new account at <https://www.myshiptracking.com/user/account/api>.

## Conversational regatta management

Treat Telegram race messages as potentially incomplete, informal, or corrected
later. Read the race-management protocol in
`hermes/skills/first-mythos-cup/references/operations.md` before changing a
leg, its schedule, or its points.

- For a new leg, collect at least: **name**, **start coordinates**, **finish
  coordinates**, **start time**, and **finish time**. Accept decimal degrees or
  degrees/minutes, normalize N/E/S/W correctly, and confirm the normalized
  values and Greece local time plus UTC before writing.
- If “the race just finished” uniquely identifies an active leg, set its finish
  to the message time (or the stated relative time), mark it finished, and
  report the exact saved timestamps. Ask one concise clarification if multiple
  legs could match.
- Accept later corrections to start/end times and score changes. Never silently
  infer a boat, date, time zone, coordinate hemisphere, or points value when
  it is ambiguous.
- Points are manual, per boat, integers from 0–100. Write only specified values
  and let the database trigger recompute the leaderboard; never edit totals.
