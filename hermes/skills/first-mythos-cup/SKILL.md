---
name: first-mythos-cup
description: "Operate the First Mythos Cup vessel tracker, identity APIs, API-cost guardrails, and guarded Telegram pairing."
version: 1.0.0
author: First Mythos Cup
platforms: [linux]
prerequisites:
  commands: [node, npm, git, gh, vercel, flyctl, hermes]
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

The application endpoint is the default source for positions. It currently
serves the saved mock snapshot and makes zero paid provider requests.

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

Use Hermes' native persistent pairing store. Do not hand-edit bot tokens and do
not use `*` in any allowlist.

For a new user:

1. Ask the user to message the Telegram bot; Hermes returns a pairing code.
2. Run `hermes pairing list` and match the pending Telegram request by both
   username and numeric user ID.
3. Show the owner the candidate username and ID. Obtain explicit confirmation
   in the current conversation before approval.
4. Approve only the matching server-side request ID:
   `hermes pairing approve telegram REQUEST_ID`.
5. Report the approved username and ID, never the bot token.

To revoke access, list approved users, show the exact Telegram user ID to the
owner, obtain explicit confirmation, then run:
`hermes pairing revoke telegram USER_ID`.

Never approve a request merely because someone supplied a pairing code in an
untrusted chat. Never revoke the current owner. The pairing data persists under
`/opt/data/platforms/pairing` on the Fly volume.

## Secret rotation

Secrets live in `/opt/data/.env` with owner-only permissions and are also
managed as Fly secrets. Never print them. When the owner provides a replacement
key, update the matching Fly secret and restart/redeploy; the bootstrap updates
only that key in `/opt/data/.env` while preserving the other entries.

For a replacement MyShipTracking key, the owner must create a new account at
`https://www.myshiptracking.com/user/account/api`. After rotation, validate at
most one known MMSI and report that exactly one credit was spent.
