# Infrastructure inventory

This file contains identifiers and status only. Secret values live exclusively in the ignored `.env.local` key vault.

## Source and hosting

- GitHub: <https://github.com/carlo088/first-mythos-cup> — live on `main`.
- Vercel: live at <https://first-mythos-cup.vercel.app>. It hosts the dashboard and vessel API only.
- Local application: <http://localhost:3000> while the development server is running.
- Fly.io: live at <https://fly.io/apps/first-mythos-cup-hermes>. `fly.toml`
  builds `hermes/Dockerfile`, runs one shared-CPU 4x / 4 GB machine in
  Frankfurt, and mounts an encrypted 2 GB `hermes_data` volume at `/opt/data`.

## Supabase

- Project URL: <https://jnqccspdghuyqxpftihk.supabase.co>
- Project reference: `jnqccspdghuyqxpftihk`
- Project/database label: `first-mythos-cup`
- Status: live with fleet, multi-race geometry/history, per-leg scores, aggregate leaderboard scores, and public-read RLS.
- Intended use: vessel position history and race scoring.
- Publishable key, database URL, and password: local values remain in
  `.env.local`; the Hermes runtime receives matching encrypted Fly secrets and
  persists them in owner-readable `/opt/data/.env` for autonomous operations.

## Vessel APIs

- Supabase simulation history: active; zero vendor calls.
- MyShipTracking: integration retained but disabled unless `VESSEL_DATA_MODE=live` is explicitly set.
- AISstream: credentials retained in `.env.local`, service currently considered down.
- Global Fishing Watch: identity/registry fallback only; token is not yet configured.

## Agent runtime

- Hermes runtime: official `nousresearch/hermes-agent:latest` image on Fly, customized under `hermes/`.
- Vessel scheduler: a separate lightweight Node child process in the same Fly machine; disabled in mock mode.
- Persistent state: Fly volume `/opt/data`; credentials are protected in `/opt/data/.env` and mirrored from Fly secrets without logging values.
- Fly receives the complete server environment required for autonomous
  operation, including Supabase management and database access. Provider keys
  remain protected by application mode and cost gates: mock vessel mode makes
  no paid MyShipTracking calls, and AISstream stays inactive until verified.
- Telegram adapter: Hermes' native gateway with persistent pairing authorization.
- Gateway status: running and verified with a direct model response. Telegram remains disabled until `TELEGRAM_BOT_TOKEN` and the owner's numeric `TELEGRAM_ALLOWED_USERS` value are supplied.
- Autonomous operations: the Fly volume contains a persistent Git checkout;
  the image includes GitHub, Vercel, and Fly tooling. Scoped deployment tokens
  must be configured before Hermes can publish without the original computer.
