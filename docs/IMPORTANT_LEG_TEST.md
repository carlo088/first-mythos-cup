# Important leg test: Prima Regatina

The mock test uses the production-shaped pipeline: writer → `vessel_positions` in Supabase → server APIs → map/replay/results. The browser never reads a local mock file, so a future GPS writer can replace the simulator without changing the schema or frontend.

## Run locally

1. Run `npm run simulate:important-leg` once to apply the additive migration and idempotently regenerate the race.
2. Run `npm run dev` and open the localhost URL printed by Next.js.
3. Verify the archive has three races and 89 reports. Prima Regatina must show elapsed times 27:00, 29:00, and 30:00.
4. Expand a full-width regatta row and pin it, then drag the full-width **Shared race clock**. All three labelled markers must move together without changing the user's map zoom or pan.
5. Verify each row shows Live/Ended plus UTC start/end. Ended rows show arrival order and editable test points; saved points must update the aggregate leaderboard.

The simulator writes spatially and temporally out-of-leg approach/departure points plus approximately seven leg positions per vessel for each of three races. Outside segments are dashed; segments whose endpoints carry the same `leg_id` are solid. These are accelerated 30-minute tests and do not run on a timer.

The frontend only reads Supabase on initial load or manual reload. The historical Fly-side writer is now retired: `VESSEL_DATA_MODE=disabled` prevents its process from starting and spends zero credits. Re-enabling live ingestion requires explicit owner authorization.

## Data contract

- `race_legs` stores route geometry, time window, corridor, and status.
- `vessel_positions.leg_id` identifies positions automatically classified by the database trigger from route corridor and leg time window.
- `GET /api/vessels/[mmsi]` returns the newest stored report.
- `GET /api/legs/important` returns the leg, full tracks, and computed finish results.

For real GPS, write normalized reports into `vessel_positions`; the trigger assigns `leg_id` when a report is inside the active route corridor and time window. Do not change the frontend read path.
