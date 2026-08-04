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
- Runtime: `src/lib/hermes.ts`; HTTP route: `GET/POST /api/hermes`. POST is bearer-authenticated.

## Key rotation

When the owner provides a new MyShipTracking key:

1. Replace only `MYSHIPTRACKING_API_KEY` in `.env.local`.
2. Keep the key server-only and do not echo it into chat, logs, screenshots, patches, or tracked files.
3. Update the same variable in the hosting provider when access is available.
4. Validate with one known MMSI, recording only HTTP status, vessel name, MMSI, received timestamp, and coordinate presence.
5. Record that exactly one validation credit was spent.

New MyShipTracking keys are created from a new account at <https://www.myshiptracking.com/user/account/api>.
