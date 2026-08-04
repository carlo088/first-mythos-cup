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
- Official Hermes Agent gateway: persistent Fly.io machine configured in `hermes/`
- Telegram: Hermes' native gateway with persistent pairing authorization

Vercel does not run Hermes or receive Telegram webhooks.

See `docs/PROJECT_PLAN.md`, `docs/VESSEL_API.md`, `docs/GLOBAL_FISHING_WATCH.md`, and `AGENTS.md` before changing provider or polling behavior.
