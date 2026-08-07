# MyShipTracking Vessel API v2 — simple response

## Upstream endpoint

`GET https://api.myshiptracking.com/api/v2/vessel?mmsi={MMSI}&response=simple`

The simple response costs **1 credit**.

```bash
API_KEY='YOUR_API_KEY'
MMSI='240576800'

curl -sS \
  -H "x-api-key: ${API_KEY}" \
  -H "Accept: application/json" \
  "https://api.myshiptracking.com/api/v2/vessel?mmsi=${MMSI}&response=simple"
```

Bearer authentication is also supported:

```bash
-H "Authorization: Bearer ${API_KEY}"
```

Example response:

```json
{
  "status": "success",
  "duration": "0.000159921",
  "timestamp": "2026-08-04T20:38:37.295Z",
  "data": {
    "vessel_name": "FIZZY",
    "mmsi": 240576800,
    "imo": null,
    "vtype": 9,
    "lat": 37.69558,
    "lng": 24.05911,
    "course": 511,
    "speed": 0,
    "nav_status": 5,
    "received": "2026-08-04T19:19:23Z"
  }
}
```

Important fields:

- `vessel_name`: vessel name.
- `mmsi`: vessel identifier.
- `lat`, `lng`: latest available coordinates.
- `course`: degrees; `511` generally means unavailable.
- `speed`: knots.
- `nav_status`: AIS navigation status code.
- `received`: UTC timestamp when the position was received.

## Application endpoint

`GET /api/vessels/{mmsi}`

Only known fleet MMSIs are accepted. The response is normalized for the UI, includes `course: null` when the upstream reports `511`, and includes `stale` and `ageSeconds` fields.

The application runs with `VESSEL_DATA_MODE=live`; the scheduled worker writes
normalized MyShipTracking reports to the same `vessel_positions` table that
every frontend reads. If a vessel stops transmitting, the API continues to
serve its last-known provider report and sets `stale` from the age of its
`received` timestamp; it does not substitute simulation data or invent a newer
AIS timestamp.

## Identity fallback

Global Fishing Watch Vessels API v3 is documented in `docs/GLOBAL_FISHING_WATCH.md`. It may enrich identity and registry details but does not replace this endpoint's last-known coordinates.
