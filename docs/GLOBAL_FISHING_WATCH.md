# Global Fishing Watch Vessels API v3

Global Fishing Watch is an **identity and registry fallback**, not a live
position provider. Use it to enrich the fleet with vessel name, flag, callsign,
IMO and transmission-range metadata. Keep saved coordinates (or an explicitly
enabled live AIS provider) as the position source.

## Search endpoint

`GET https://gateway.api.globalfishingwatch.org/v3/vessels/search`

```bash
GFW_API_TOKEN='YOUR_TOKEN'

curl -G 'https://gateway.api.globalfishingwatch.org/v3/vessels/search' \
  -H "Authorization: Bearer ${GFW_API_TOKEN}" \
  -H 'Accept: application/json' \
  --data-urlencode 'query=240576800' \
  --data-urlencode 'datasets[0]=public-global-vessel-identity:latest' \
  --data-urlencode 'limit=10'
```

Parameters:

- `query`: MMSI, IMO, callsign, or vessel name.
- `datasets[0]`: required; use `public-global-vessel-identity:latest`.
- `limit`: optional; maximum 50.
- `since`: optional pagination token.
- `includes[0]`: optional `MATCH_CRITERIA`, `OWNERSHIP`, or `AUTHORIZATIONS`.
- `match-fields`: optional `SEVERAL_FIELDS`, `NO_MATCH`, or `ALL`.

The response contains `limit`, `since`, `total`, and `entries`. Identity fields
normally appear in each entry's `selfReportedInfo` array.

## Resolved record

`GET https://gateway.api.globalfishingwatch.org/v3/vessels/{vesselId}?dataset=public-global-vessel-identity:latest`

The tracked token variable is `GFW_API_TOKEN`; the value belongs only in
`.env.local`, the Fly secret store, and Hermes' protected `/opt/data/.env`.

Official reference: <https://globalfishingwatch.org/our-apis/documentation#introduction-vessels-api>

Review Global Fishing Watch's non-commercial-use and attribution requirements
before displaying or redistributing its data.
