# First Mythos Cup

Live AIS tracker for the First Mythos Cup fleet.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Credentials are read from the ignored `.env.local`; use `.env.example` as the variable inventory.

The default `VESSEL_DATA_MODE=mock` serves the saved snapshot in `data/vessel-snapshot.json` and makes no MyShipTracking requests.

## Services

- Web dashboard: `/`
- Vessel snapshot API: `GET /api/vessels/{mmsi}`
- Hermes health: `GET /api/hermes`
- Hermes chat: authenticated `POST /api/hermes` with `{ "input": "..." }`

Run `npm run hermes:token` locally to derive the bearer token used by the protected Hermes endpoint. Never paste that token into source control.

See `docs/PROJECT_PLAN.md`, `docs/VESSEL_API.md`, and `AGENTS.md` before changing provider or polling behavior.
