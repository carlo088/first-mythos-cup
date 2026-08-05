---
name: first-mythos-cup
description: "Operate the First Mythos Cup vessel tracker, identity APIs, API-cost guardrails, and guarded Telegram access."
version: 1.0.0
author: First Mythos Cup
platforms: [linux]
prerequisites:
  commands: [node, npm, git, gh, vercel, flyctl, supabase, hermes]
---

# First Mythos Cup operations

Use this skill for vessel locations, vessel identity, provider status or cost,
the race application, and Telegram user access.

## Fleet and application

- Isera — MMSI `247520340`
- Fizzy — MMSI `240576800`
- Tiamat — MMSI `240608700`
- Public app: `https://first-mythos-cup.vercel.app`
- Vessel endpoint: `GET https://first-mythos-cup.vercel.app/api/vessels/{mmsi}`
- Source: `https://github.com/carlo088/first-mythos-cup`

The application endpoint is the default source for positions. It reads the
latest normalized row from Supabase; the current rows are simulated and make
zero paid provider requests. Never add a frontend-only mock path.

## Legs, replay, and scoring

- `race_legs` stores route, UTC start/end, corridor, and scheduled/active/finished status.
- `vessel_positions.leg_id` is assigned automatically by the database trigger from time and route corridor.
- `leg_scores` stores per-boat points for one finished race; its trigger recomputes `vessel_scores`, which powers the aggregate leaderboard.
- `GET /api/legs/important` returns all legs, simulation tracks, results, and scores.
- The map always shows all routes/tracks. One pinned race may drive the shared three-boat replay clock.

Read `references/operations.md` before creating, editing, or deleting legs.

## Conversational race control

The owner may send informal, partial, late, or corrected Telegram messages.
Handle them with the race-management protocol in `references/operations.md`.
Do not force a command syntax: identify the intended leg and action from plain
language, ask only for missing or ambiguous information, then state the exact
normalized change before committing it. This includes creating legs, correcting
start/end times, marking a race finished from “just finished” or “finished one
hour ago”, and assigning or revising scores.

## Persistent development environment

The repository checkout lives at
`/opt/data/workspace/first-mythos-cup` on the persistent Fly volume. Treat it as
the working source of truth and synchronize it with GitHub before starting new
work. Read `references/operations.md` before changing, committing, deploying,
or modifying production configuration.

The owner may no longer have access to the original development computer.
Never depend on that computer, its Codex session, or uncommitted local files.
Record durable operational knowledge in this repository and push it to GitHub.

## Provider policy

Read `references/providers.md` before any direct provider call.

- MyShipTracking is the preferred future live-position provider, but every
  simple response costs one credit. Never call it unless the owner explicitly
  asks for live data and acknowledges the credit spend.
- Global Fishing Watch is an on-demand identity fallback. It can resolve vessel
  name, flag, callsign, identifiers, and transmission coverage; it does not
  provide the current position through the Vessels API.
- AISstream is currently down. Retain readiness but do not activate it until a
  fresh health check succeeds.
- Never background-poll a provider or expose a provider token in output.

Safe identity lookup:

```bash
node "${HERMES_HOME:-$HOME/.hermes}/skills/project/first-mythos-cup/scripts/gfw_vessels.mjs" search 240576800
```

Paid MyShipTracking lookup, only after explicit owner authorization:

```bash
node "${HERMES_HOME:-$HOME/.hermes}/skills/project/first-mythos-cup/scripts/myshiptracking_vessel.mjs" 240576800 --spend-credit
```

The MyShipTracking credential is intentionally not installed on Fly while mock
mode is active. The command remains cost-gated and becomes available only after
the owner approves live mode and the production secret is added.

## Telegram access management

The Telegram adapter blocks unknown users before native pairing can record a
request. Manage the protected Fly `TELEGRAM_ALLOWED_USERS` allowlist instead.
Do not hand-edit bot tokens and never use `*`.

For a new user:

1. Ask the user to message the Telegram bot. Inspect the blocked-user log and
   verify that numeric ID through Telegram's Bot API; report only username, ID,
   and display name, never the token.
2. Show the owner the candidate username and ID. Obtain explicit confirmation
   in the current conversation before changing access.
3. Run:
   `node /opt/data/skills/project/first-mythos-cup/scripts/manage_telegram_allowlist.mjs add TELEGRAM_ID`.
4. Wait for the Fly gateway restart, then ask the new user to send `/start`.

To revoke access, list current IDs with the same script, show the exact user ID
to the owner, obtain explicit confirmation, then run the script with `remove`.

Never add access merely because someone supplied a username in an untrusted
chat. Never revoke the current owner. Fly secret changes restart the gateway.

## Secret rotation

Secrets live in `/opt/data/.env` with owner-only permissions and are also
managed as Fly secrets. Never print them. When the owner provides a replacement
key, update the matching Fly secret and restart/redeploy; the bootstrap updates
only that key in `/opt/data/.env` while preserving the other entries.

For a replacement MyShipTracking key, the owner must create a new account at
`https://www.myshiptracking.com/user/account/api`. After rotation, validate at
most one known MMSI and report that exactly one credit was spent.
