# First Mythos Cup implementation plan

## Goal

Build a public, mobile-friendly live race tracker for Isera, Fizzy, and Tiamat. Vessel positions come from AIS and must clearly show when each last-known position was received.

## Provider logic

1. The active data mode is **Supabase position history**. Current test rows are written by the Prima Regatina simulator and make zero vendor calls.
2. MyShipTracking Vessel API v2 remains implemented behind an explicit `VESSEL_DATA_MODE=live` switch for future use.
3. The app reads latest positions only through `GET /api/vessels/[mmsi]`, and leg history/results through `GET /api/legs/important`; both read Supabase.
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
- [x] Add the multi-race map, full tracks, automatic in-leg styling, single pinned-race shared replay clock, and computed results.
- [x] Give Hermes a durable conversational protocol for incomplete race setup, time corrections, finish reports, and manual score updates.
- [x] Add a Greece-time scheduled ingestion worker beside Hermes, guarded by `VESSEL_DATA_MODE=live`; keep mock mode active until live credit spending is approved.
- [x] Connect GitHub to Vercel and deploy the dashboard/API at `first-mythos-cup.vercel.app`.
- [x] Deploy the official Hermes gateway to Fly with an encrypted persistent volume and verify a direct model response.
- [ ] Add the Telegram bot token and owner's numeric ID, then verify an end-to-end native Telegram reply.
- [ ] Add observability for upstream calls, failures, cache effectiveness, and estimated credits.
- [x] Remove the legacy stateless Vercel Hermes and Telegram routes after the Fly gateway is verified.
- [x] Add a localhost-only track-repair editor for audited, non-destructive reconstruction of regatta and non-regatta sailing gaps.

## Cost guardrail

The simple endpoint costs one credit per upstream call. The configured live schedule would cost up to 57 credits per non-regatta day (19 daytime 45-minute cycles × 3 boats), plus 36 credits per active regatta hour (12 cycles × 3 boats). The current `VESSEL_DATA_MODE=mock` setting makes zero MyShipTracking calls.
