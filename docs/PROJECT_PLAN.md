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
9. Use Global Fishing Watch Vessels API v3 only as an on-demand identity and registry fallback. It does not supply live positions.

## Delivery phases

- [x] Project skeleton, shared agent instructions, local secret vault, fleet registry.
- [x] Cost-aware server endpoint and normalized vessel response.
- [x] Initial public dashboard with manual refresh and data-age indicators.
- [x] Persist the saved snapshot in Supabase with an idempotent migration and public-read RLS.
- [x] Prepare the official persistent Hermes Agent image, Fly configuration, protected secret bootstrap, and project skill.
- [x] Add native Telegram gateway instructions and guarded persistent pairing management.
- [ ] Add a nautical map and course/race geometry.
- [ ] Add a scheduled ingestion worker only after a call-budget calculation is approved.
- [x] Connect GitHub to Vercel and deploy the dashboard/API at `first-mythos-cup.vercel.app`.
- [x] Deploy the official Hermes gateway to Fly with an encrypted persistent volume and verify a direct model response.
- [ ] Add the Telegram bot token and owner's numeric ID, then verify an end-to-end native Telegram reply.
- [ ] Add observability for upstream calls, failures, cache effectiveness, and estimated credits.
- [x] Remove the legacy stateless Vercel Hermes and Telegram routes after the Fly gateway is verified.

## Cost guardrail

The simple endpoint costs one credit per upstream call. At three vessels, polling once per minute would be 4,320 credits/day before caching effects. The current release uses a committed snapshot and therefore costs zero MyShipTracking credits. Any return to live mode or background schedule must state its projected daily and monthly credits before implementation.
