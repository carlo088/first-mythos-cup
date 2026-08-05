"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetMap, type MappedVessel } from "@/components/fleet-map";
import type { VesselPosition } from "@/lib/myshiptracking";
import { FLEET, type FleetVessel } from "@/lib/vessels";
import { sortLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { formatElapsed, type ImportantLeg, type LegResult, type LegTrack } from "@/lib/important-leg";

type VesselState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; position: VesselPosition };

type LeaderboardState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: LeaderboardEntry[] };

type LegState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; races: RaceArchiveEntry[]; tracks: LegTrack[] };

type RaceArchiveEntry = {
  leg: ImportantLeg;
  results: LegResult[];
  scores: Array<{ leg_id: string; mmsi: string; points: number }>;
};

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
          <i /> {position.provider === "supabase" ? "Supabase track" : position.stale ? "Stale report" : "AIS received"}
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({ status: "loading" });
  const [legState, setLegState] = useState<LegState>({ status: "loading" });
  const [pinnedLegId, setPinnedLegId] = useState<string | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [savingScore, setSavingScore] = useState<string | null>(null);

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
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      const body = (await response.json()) as { data?: LeaderboardEntry[] };
      if (!response.ok || !body.data) throw new Error("Leaderboard unavailable");
      setLeaderboard({ status: "ready", entries: sortLeaderboard(body.data) });
    } catch {
      setLeaderboard({ status: "error" });
    }
    try {
      const response = await fetch("/api/legs/important", { cache: "no-store" });
      const body = (await response.json()) as { data?: { races: RaceArchiveEntry[]; tracks: LegTrack[] }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error || "Leg unavailable");
      setLegState({ status: "ready", ...body.data });
      setPinnedLegId((current) => current && body.data!.races.some((race) => race.leg.id === current) ? current : null);
    } catch (error) {
      setLegState({ status: "error", message: error instanceof Error ? error.message : "Leg unavailable" });
    }
    setUpdatedAt(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => { void loadFleet(); }, [loadFleet]);

  const mappedVessels = useMemo(() => FLEET.flatMap((vessel): MappedVessel[] => {
    const state = states[vessel.mmsi];
    return state?.status === "ready" ? [{ vessel, position: state.position }] : [];
  }), [states]);
  const mappedLegs = useMemo(
    () => legState.status === "ready" ? legState.races.map((race) => race.leg) : [],
    [legState],
  );

  const replayTimeline = legState.status === "ready" && pinnedLegId
    ? [...new Set(legState.tracks.flatMap((track) => track.points.filter((point) => point.legId === pinnedLegId).map((point) => point.receivedAt)))].sort()
    : [];
  const replayAt = replayTimeline[Math.min(replayIndex, Math.max(0, replayTimeline.length - 1))];

  function togglePinnedRace(legId: string) {
    if (!legId) return;
    setPinnedLegId((current) => current === legId ? null : legId);
    setReplayIndex(0);
  }

  async function saveRaceScore(legId: string, mmsi: string, points: number) {
    setSavingScore(mmsi);
    try {
      const response = await fetch("/api/legs/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legId, mmsi, points }),
      });
      if (!response.ok) throw new Error("Score save failed");
      await loadFleet();
    } finally {
      setSavingScore(null);
    }
  }

  return (
    <section className="fleet-section" aria-labelledby="fleet-title">
      <div className="section-heading">
        <div>
          <span className="section-number">01 / FLEET MAP</span>
          <h3 id="fleet-title">Map</h3>
        </div>
        <button type="button" onClick={() => void loadFleet()} disabled={refreshing}>
          <span className={refreshing ? "spin" : ""}>↻</span> {refreshing ? "Loading…" : "Reload snapshot"}
        </button>
      </div>
      <div className="cost-note">SUPABASE POSITION HISTORY · ZERO PAID AIS CALLS · ACCELERATED 30-MINUTE TEST</div>
      <FleetMap
        vessels={mappedVessels}
        legs={mappedLegs}
        tracks={legState.status === "ready" ? legState.tracks : []}
        pinnedLegId={pinnedLegId}
        replayAt={replayAt}
      />
      {legState.status === "ready" && <div className="replay-panel replay-panel-wide replay-under-map">
        <div className="replay-copy"><span className="section-number">02 / SHARED TRACKER</span><h3>{pinnedLegId ? mappedLegs.find((leg) => leg.id === pinnedLegId)?.name : "Pin a regata to replay"}</h3></div>
        <label className="replay-range">Shared race clock<input aria-label="Replay shared race clock" type="range" min={0} max={Math.max(0, replayTimeline.length - 1)} value={Math.min(replayIndex, Math.max(0, replayTimeline.length - 1))} disabled={!pinnedLegId} onChange={(event) => setReplayIndex(Number(event.target.value))} /></label>
        <div className="replay-meta"><output>{replayAt ? `${new Date(replayAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC · ALL BOATS` : "No regata pinned"}</output>{pinnedLegId && <button type="button" onClick={() => setPinnedLegId(null)}>Unpin active regata</button>}</div>
      </div>}
      {legState.status === "error" && <div className="leaderboard-message error-card">{legState.message}</div>}
      {legState.status === "ready" && (
        <div className="regattas-section">
          <details className="regattas-dropdown">
            <summary><span className="section-number">03 / REGATE · {legState.races.length}</span><h3>Regate</h3><i>⌄</i></summary>
            <div className="regatta-table" role="table" aria-label="Regate">
            <div className="regatta-row regatta-header" role="row"><span>Status</span><span>Regata</span><span>Start / End</span><span>Arrival order</span><span>Points</span><span /></div>
            {legState.races.map((race) => {
              const isLive = race.leg.status === "active";
              return <div className="regatta-row regatta-flat-row" role="row" key={race.leg.id}>
                  <span className={`race-status ${isLive ? "live" : "ended"}`}>{isLive ? "Live" : "Ended"}</span>
                  <strong>{race.leg.name}</strong>
                  <span className="regatta-times"><time>{new Date(race.leg.startsAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</time><time>{new Date(race.leg.endsAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</time></span>
                  <span className="compact-arrivals">{isLive ? "In progress" : race.results.map((result) => `${result.rank} ${result.name}`).join(" · ")}</span>
                  <span className="compact-scores">{isLive ? "—" : race.results.map((result) => { const current = race.scores.find((score) => score.mmsi === result.mmsi)?.points ?? 0; return <label key={result.mmsi}>{result.name.slice(0, 1)}<input aria-label={`${race.leg.name} ${result.name} points`} type="number" min={0} max={100} defaultValue={current} disabled={savingScore === result.mmsi} onBlur={(event) => void saveRaceScore(race.leg.id, result.mmsi, Number(event.target.value))} /></label>; })}</span>
                  <button type="button" className={pinnedLegId === race.leg.id ? "is-pinned" : ""} onClick={() => togglePinnedRace(race.leg.id)}>{pinnedLegId === race.leg.id ? "Unpin" : "Pin"}</button>
              </div>;
            })}
            </div>
          </details>
        </div>
      )}
      <div className="detail-heading">
        <span className="section-number">04 / FIRST 36 FLEET</span>
        <h3>Leaderboard</h3>
      </div>
      {leaderboard.status === "loading" && <div className="leaderboard-message">Loading points…</div>}
      {leaderboard.status === "error" && <div className="leaderboard-message error-card">Points unavailable right now.</div>}
      {leaderboard.status === "ready" && (
        <div className="leaderboard" role="table" aria-label="First 36 vessel leaderboard">
          <div className="leaderboard-row leaderboard-header" role="row">
            <span>Rank</span><span>Vessel</span><span>Last report</span><span>Total points</span>
          </div>
          {leaderboard.entries.map((entry, index) => {
            const state = states[entry.mmsi];
            return (
              <div className="leaderboard-row" role="row" key={entry.mmsi}>
                <strong className="leaderboard-rank">{String(index + 1).padStart(2, "0")}</strong>
                <span className="leaderboard-vessel"><i style={{ background: entry.color }} />{entry.name}</span>
                <span className="leaderboard-report">
                  {state?.status === "ready" ? (state.position.stale ? "Stale AIS" : "AIS received") : "Report unavailable"}
                </span>
                <strong className="leaderboard-points">{entry.totalPoints}<small> pts</small></strong>
              </div>
            );
          })}
        </div>
      )}
      <div className="reports-heading"><span className="section-number">05 / VESSEL REPORTS</span><h3>Last-known telemetry</h3></div>
      <div className="fleet-grid">
        {FLEET.map((vessel) => <VesselCard key={vessel.mmsi} vessel={vessel} state={states[vessel.mmsi]} />)}
      </div>
      {updatedAt && <p className="dashboard-time">Dashboard checked at {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
    </section>
  );
}
