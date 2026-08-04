"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetMap, type MappedVessel } from "@/components/fleet-map";
import type { VesselPosition } from "@/lib/myshiptracking";
import { FLEET, type FleetVessel } from "@/lib/vessels";

type VesselState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; position: VesselPosition };

const NAV_STATUS: Record<number, string> = {
  0: "Under way",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  5: "Moored",
  7: "Fishing",
  8: "Under sail",
};

function ageLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function VesselCard({ vessel, state }: { vessel: FleetVessel; state: VesselState }) {
  if (state.status === "loading") {
    return <article className="vessel-card loading"><div className="shimmer" /></article>;
  }

  if (state.status === "error") {
    return (
      <article className="vessel-card error-card">
        <div className="card-index" style={{ color: vessel.color }}>—</div>
        <h2>{vessel.name}</h2>
        <p>{state.message}</p>
        <small>MMSI {vessel.mmsi}</small>
      </article>
    );
  }

  const { position } = state;
  return (
    <article className="vessel-card">
      <div className="card-top">
        <span className="card-index" style={{ color: vessel.color }}>0{FLEET.indexOf(vessel) + 1}</span>
        <span className={`signal ${position.stale ? "stale" : ""}`}>
          <i /> {position.provider === "mock" ? "Saved snapshot" : position.stale ? "Stale report" : "AIS received"}
        </span>
      </div>
      <p className="model-label">Beneteau First 36</p>
      <h2>{vessel.name}</h2>
      <div className="position">
        <span>{position.lat.toFixed(5)}° N</span>
        <span>{position.lng.toFixed(5)}° E</span>
      </div>
      <dl>
        <div><dt>Speed</dt><dd>{position.speedKnots.toFixed(1)} <small>kn</small></dd></div>
        <div><dt>Course</dt><dd>{position.course === null ? "—" : `${position.course}°`}</dd></div>
        <div><dt>Status</dt><dd className="text-value">{NAV_STATUS[position.navigationStatus] || `AIS ${position.navigationStatus}`}</dd></div>
      </dl>
      <div className="received">
        <span>Last position</span>
        <time dateTime={position.receivedAt}>{ageLabel(position.ageSeconds)}</time>
      </div>
    </article>
  );
}

export function FleetDashboard() {
  const [states, setStates] = useState<Record<string, VesselState>>(() =>
    Object.fromEntries(FLEET.map((vessel) => [vessel.mmsi, { status: "loading" }])),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadFleet = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.all(
      FLEET.map(async (vessel): Promise<[string, VesselState]> => {
        try {
          const response = await fetch(`/api/vessels/${vessel.mmsi}`);
          const body = (await response.json()) as { data?: VesselPosition; error?: string };
          if (!response.ok || !body.data) throw new Error(body.error || "Position unavailable");
          return [vessel.mmsi, { status: "ready", position: body.data }];
        } catch (error) {
          return [vessel.mmsi, { status: "error", message: error instanceof Error ? error.message : "Position unavailable" }];
        }
      }),
    );
    setStates(Object.fromEntries(results));
    setUpdatedAt(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => { void loadFleet(); }, [loadFleet]);

  const mappedVessels = useMemo(() => FLEET.flatMap((vessel): MappedVessel[] => {
    const state = states[vessel.mmsi];
    return state?.status === "ready" ? [{ vessel, position: state.position }] : [];
  }), [states]);

  return (
    <section className="fleet-section" aria-labelledby="fleet-title">
      <div className="section-heading">
        <div>
          <span className="section-number">01 / FLEET MAP</span>
          <h3 id="fleet-title">Last known positions</h3>
        </div>
        <button type="button" onClick={() => void loadFleet()} disabled={refreshing}>
          <span className={refreshing ? "spin" : ""}>↻</span> {refreshing ? "Loading…" : "Reload snapshot"}
        </button>
      </div>
      <div className="cost-note">SAVED AIS SNAPSHOT · ZERO PROVIDER CALLS · NO BACKGROUND POLLING</div>
      <FleetMap vessels={mappedVessels} />
      <div className="detail-heading">
        <span className="section-number">02 / FIRST 36 FLEET</span>
        <h3>Vessel reports</h3>
      </div>
      <div className="fleet-grid">
        {FLEET.map((vessel) => <VesselCard key={vessel.mmsi} vessel={vessel} state={states[vessel.mmsi]} />)}
      </div>
      {updatedAt && <p className="dashboard-time">Dashboard checked at {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
    </section>
  );
}
