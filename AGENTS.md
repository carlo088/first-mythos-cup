# First Mythos Cup agent instructions

This repository is shared by Codex and the Hermes agent. Read this file, `.agents/hermes.md`, and `docs/PROJECT_PLAN.md` before changing the application.

## Secrets and configuration

- All local credentials live in `.env.local` at the repository root. It is ignored by git and must never be printed, copied into source, screenshots, logs, commits, issues, or chat responses.
- `.env.example` is the tracked inventory of required variable names. It must contain placeholders only.
- When the user supplies a replacement key, update only the matching value in `.env.local`. Preserve all other values and update the corresponding deployment secret separately when deployment access exists.
- Never prefix server secrets with `NEXT_PUBLIC_`. Browser code must call our internal API rather than a vendor directly.
- If a credential is exposed publicly, recommend revocation and rotation; do not keep propagating it.

## Vessel data providers and costs

- Active mode now: **Supabase simulation history**; it makes zero provider calls. The frontend reads our server APIs, which read Supabase—never a local mock-only path.
- MyShipTracking Vessel API v2 remains the preferred future live provider, documented in `docs/VESSEL_API.md`. It may only run when `VESSEL_DATA_MODE=live` is explicitly configured.
- Each MyShipTracking simple request costs **1 credit**. Monitor credit use, retain server caching, avoid accidental polling, and report any change that can materially increase calls before shipping it.
- A replacement MyShipTracking API key requires a new account at <https://www.myshiptracking.com/user/account/api>. Once the user provides the key, replace `MYSHIPTRACKING_API_KEY` in `.env.local` and in the hosting provider's server-side environment; never commit it.
- `aistream.io` is currently down. Keep `AISTREAM_API_KEY` configured and preserve a provider abstraction so it can be enabled later, but do not use it as the active provider until its availability has been verified.
- Global Fishing Watch Vessels API v3 is the fallback for vessel **identity and registry metadata only**, documented in `docs/GLOBAL_FISHING_WATCH.md`. It is not a live-position endpoint and must not replace the saved coordinates or a live AIS position provider.

## Known vessels

- Isera — MMSI `247520340`
- Fizzy — MMSI `240576800`
- Tiamat — MMSI `240608700`

## Engineering rules

- Validate MMSIs before making paid upstream calls.
- Keep vendor calls server-side and use cache/revalidation.
- Treat AIS data as last-known telemetry; always display its `received` time and stale state.
- Never interpret course `511` as a real bearing; it means unavailable.
- Run type checking and tests before committing.

## Infrastructure

- The non-secret service inventory and current deployment status are in `docs/INFRASTRUCTURE.md`.
- GitHub is the source repository. Vercel is the intended web host once the repository is linked.
- Supabase is reserved for persisted position history. Do not expose its database password or database connection string to browser code.
- The official Nous Research Hermes Agent runs as a persistent gateway on Fly.io with `/opt/data` on a volume. Vercel must not host the Hermes daemon or Telegram gateway.
- Telegram access uses the protected `TELEGRAM_ALLOWED_USERS` Fly allowlist. Require the owner to confirm the exact username and numeric ID before Hermes adds or removes access; never use wildcard access.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
