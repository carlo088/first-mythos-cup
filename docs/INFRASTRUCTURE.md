# Infrastructure inventory

This file contains identifiers and status only. Secret values live exclusively in the ignored `.env.local` key vault.

## Source and hosting

- GitHub: <https://github.com/carlo088/first-mythos-cup>
- Vercel: intended host; deployment is in progress.
- Fly.io: support/evaluation is pending. Use only if a continuously running ingestion worker becomes necessary.

## Supabase

- Project URL: <https://jnqccspdghuyqxpftihk.supabase.co>
- Project reference: `jnqccspdghuyqxpftihk`
- Project/database label: `first-mythos-cup`
- Status: live with fleet tables, public-read RLS, and three mock position rows.
- Intended use: vessel position history and later race data.
- Publishable key, database URL, and password: `.env.local` only.

## Vessel APIs

- Saved snapshot: active; zero vendor calls.
- MyShipTracking: integration retained but disabled unless `VESSEL_DATA_MODE=live` is explicitly set.
- AISstream: credentials retained in `.env.local`, service currently considered down.

## Agent runtime

- Hermes runtime: `src/lib/hermes.ts`, exposed through `GET/POST /api/hermes`.
- Hermes model identifier is configured with `HERMES_MODEL` in `.env.local`.
- Hermes API access is configured with `OPENAI_API_KEY` in `.env.local`.
