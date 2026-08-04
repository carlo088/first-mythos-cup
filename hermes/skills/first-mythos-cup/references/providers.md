# Vessel provider reference

## Active application snapshot

`GET https://first-mythos-cup.vercel.app/api/vessels/{mmsi}`

This is the default position source. It serves saved coordinates while
`VESSEL_DATA_MODE=mock` and makes no provider calls.

## MyShipTracking Vessel API v2

Endpoint:

`GET https://api.myshiptracking.com/api/v2/vessel?mmsi={MMSI}&response=simple`

Authentication is either `x-api-key: <key>` or `Authorization: Bearer <key>`.
The simple response costs one credit. Important fields are `vessel_name`,
`mmsi`, `lat`, `lng`, `course`, `speed`, `nav_status`, and `received`. Course
`511` means unavailable, not 511 degrees.

## Global Fishing Watch Vessels API v3

Search endpoint:

`GET https://gateway.api.globalfishingwatch.org/v3/vessels/search`

Headers:

- `Authorization: Bearer <GFW_API_TOKEN>`
- `Accept: application/json`

Parameters:

- `query`: MMSI, IMO, callsign, or vessel name.
- `datasets[0]`: required; `public-global-vessel-identity:latest`.
- `limit`: optional, maximum 50.
- `since`: optional pagination token.
- `includes[0]`: optional `MATCH_CRITERIA`, `OWNERSHIP`, or `AUTHORIZATIONS`.
- `match-fields`: optional `SEVERAL_FIELDS`, `NO_MATCH`, or `ALL`.

Resolved record endpoint:

`GET https://gateway.api.globalfishingwatch.org/v3/vessels/{vesselId}?dataset=public-global-vessel-identity:latest`

This API is an identity and registry source, not a live-position provider.
Follow Global Fishing Watch's non-commercial-use and attribution requirements.

## AISstream

The credential is retained, but the service is currently considered down.
Do not use it as the active provider until availability has been verified.
