# First Mythos Cup implementation plan

## Goal

Build a public, mobile-friendly live race tracker for Isera, Fizzy, and Tiamat. Vessel positions come from AIS and must clearly show when each last-known position was received.

## Provider logic

1. The active data mode is **saved mock snapshot**. Production and local development set `VESSEL_DATA_MODE=mock`, which makes zero vendor calls.
2. MyShipTracking Vessel API v2 remains implemented behind an explicit `VESSEL_DATA_MODE=live` switch for future use.
3. The app obtains either source only through the server endpoint `GET /api/vessels/[mmsi]`.
4. Validate the MMSI against the known race fleet before returning data or spending a provider credit.
5. If live mode is explicitly enabled, cache successful upstream responses for at least `VESSEL_CACHE_SECONDS` (default 60 seconds).
6. Normalize course `511` to `null`, retain speed in knots, and calculate whether the report is stale.
7. Return a useful upstream error without leaking credentials.
8. Keep the provider boundary replaceable. AISstream is configured but inactive while the service is down; verify health before future activation.

## Delivery phases

- [x] Project skeleton, shared agent instructions, local secret vault, fleet registry.
- [x] Cost-aware server endpoint and normalized vessel response.
- [x] Initial public dashboard with manual refresh and data-age indicators.
- [x] Persist the saved snapshot in Supabase with an idempotent migration and public-read RLS.
- [x] Add the authenticated Hermes service at `GET/POST /api/hermes` using `gpt-5.6-luna`.
- [x] Add a secret-validated, chat-allowlisted Telegram webhook and registration tooling.
- [ ] Add a nautical map and course/race geometry.
- [ ] Add a scheduled ingestion worker only after a call-budget calculation is approved.
- [x] Connect GitHub to Vercel and deploy the dashboard/API at `first-mythos-cup.vercel.app`.
- [ ] Add Telegram production variables, register the webhook, and verify an end-to-end Telegram reply.
- [ ] Add observability for upstream calls, failures, cache effectiveness, and estimated credits.
- [ ] Evaluate Fly.io only if a continuously running ingestion worker is needed.

## Cost guardrail

The simple endpoint costs one credit per upstream call. At three vessels, polling once per minute would be 4,320 credits/day before caching effects. The current release uses a committed snapshot and therefore costs zero MyShipTracking credits. Any return to live mode or background schedule must state its projected daily and monthly credits before implementation.
