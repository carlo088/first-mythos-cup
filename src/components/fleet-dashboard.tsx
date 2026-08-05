"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetMap, type MappedVessel } from "@/components/fleet-map";
import type { VesselPosition } from "@/lib/myshiptracking";
import { FLEET, type FleetVessel } from "@/lib/vessels";
import { sortLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { type ImportantLeg, type LegResult, type LegTrack } from "@/lib/important-leg";

export type Language = "en" | "it";

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

const NAV_STATUS: Record<Language, Record<number, string>> = {
  en: {
  0: "Under way",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  5: "Moored",
  7: "Fishing",
  8: "Under sail",
  },
  it: {
    0: "In navigazione",
    1: "All'ancora",
    2: "Non governabile",
    3: "Manovrabilità limitata",
    5: "Ormeggiata",
    7: "Pesca",
    8: "A vela",
  },
};

const COPY = {
  en: {
    map: "Map", reload: "Reload snapshot", loading: "Loading…", history: "SUPABASE POSITION HISTORY · ZERO PAID AIS CALLS · ACCELERATED 30-MINUTE TEST",
    sharedTracker: "SHARED TRACKER", pinRace: "Pin a regata to replay", noRace: "No regata pinned", unpinRace: "Unpin active regata", raceClock: "Shared race clock",
    races: "Regate", status: "Status", race: "Regata", startEnd: "Start / End", arrivalOrder: "Arrival order", points: "Points", live: "Live", ended: "Ended", progress: "In progress", pin: "Pin", unpin: "Unpin",
    leaderboard: "Leaderboard", loadingPoints: "Loading points…", pointsUnavailable: "Points unavailable right now.", rank: "Rank", vessel: "Vessel", lastReport: "Last report", totalPoints: "Total points", staleAis: "Stale AIS", aisReceived: "AIS received", reportUnavailable: "Report unavailable",
    reports: "VESSEL REPORTS", telemetry: "Last-known telemetry", checked: "Dashboard checked at", supabaseTrack: "Supabase track", staleReport: "Stale report", speed: "Speed", course: "Course", vesselStatus: "Status", lastPosition: "Last position", unavailable: "Position unavailable", ais: "AIS",
  },
  it: {
    map: "Mappa", reload: "Ricarica dati", loading: "Caricamento…", history: "STORICO POSIZIONI SUPABASE · NESSUNA CHIAMATA AIS A PAGAMENTO · TEST ACCELERATO DI 30 MINUTI",
    sharedTracker: "TRACCIATORE CONDIVISO", pinRace: "Seleziona una regata", noRace: "Nessuna regata selezionata", unpinRace: "Rimuovi selezione", raceClock: "Cronometro condiviso",
    races: "Regate", status: "Stato", race: "Regata", startEnd: "Inizio / Fine", arrivalOrder: "Ordine d'arrivo", points: "Punti", live: "In corso", ended: "Conclusa", progress: "In corso", pin: "Seleziona", unpin: "Rimuovi",
    leaderboard: "Classifica", loadingPoints: "Caricamento punti…", pointsUnavailable: "Punti non disponibili al momento.", rank: "Pos.", vessel: "Barca", lastReport: "Ultimo rapporto", totalPoints: "Punti totali", staleAis: "AIS non aggiornato", aisReceived: "AIS ricevuto", reportUnavailable: "Rapporto non disponibile",
    reports: "RAPPORTI BARCHE", telemetry: "Ultima telemetria disponibile", checked: "Pannello aggiornato alle", supabaseTrack: "Traccia Supabase", staleReport: "Rapporto non aggiornato", speed: "Velocità", course: "Rotta", vesselStatus: "Stato", lastPosition: "Ultima posizione", unavailable: "Posizione non disponibile", ais: "AIS",
  },
} as const;

function ageLabel(seconds: number, language: Language) {
  if (language === "it") {
    if (seconds < 60) return `${seconds}s fa`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min fa`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h fa`;
    return `${Math.floor(seconds / 86400)} g fa`;
  }
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function VesselCard({ vessel, state, language }: { vessel: FleetVessel; state: VesselState; language: Language }) {
  const copy = COPY[language];
  if (state.status === "loading") {
    return <article className="vessel-card loading"><div className="shimmer" /></article>;
  }

  if (state.status === "error") {
    return (
      <article className="vessel-card error-card">
        <div className="card-index" style={{ color: vessel.color }}>—</div>
        <h2>{vessel.name}</h2>
        <p>{state.message === "Position unavailable" ? copy.unavailable : state.message}</p>
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
          <i /> {position.provider === "supabase" ? copy.supabaseTrack : position.stale ? copy.staleReport : copy.aisReceived}
        </span>
      </div>
      <p className="model-label">Beneteau First 36</p>
      <h2>{vessel.name}</h2>
      <div className="position">
        <span>{position.lat.toFixed(5)}° N</span>
        <span>{position.lng.toFixed(5)}° E</span>
      </div>
      <dl>
        <div><dt>{copy.speed}</dt><dd>{position.speedKnots.toFixed(1)} <small>kn</small></dd></div>
        <div><dt>{copy.course}</dt><dd>{position.course === null ? "—" : `${position.course}°`}</dd></div>
        <div><dt>{copy.vesselStatus}</dt><dd className="text-value">{NAV_STATUS[language][position.navigationStatus] || `${copy.ais} ${position.navigationStatus}`}</dd></div>
      </dl>
      <div className="received">
        <span>{copy.lastPosition}</span>
        <time dateTime={position.receivedAt}>{ageLabel(position.ageSeconds, language)}</time>
      </div>
    </article>
  );
}

export function FleetDashboard({ language }: { language: Language }) {
  const copy = COPY[language];
  const [states, setStates] = useState<Record<string, VesselState>>(() =>
    Object.fromEntries(FLEET.map((vessel) => [vessel.mmsi, { status: "loading" }])),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({ status: "loading" });
  const [legState, setLegState] = useState<LegState>({ status: "loading" });
  const [pinnedLegId, setPinnedLegId] = useState<string | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);

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

  return (
    <section className="fleet-section" aria-labelledby="fleet-title">
      <div className="section-heading">
        <div>
          <span className="section-number">01 / FLEET MAP</span>
          <h3 id="fleet-title">{copy.map}</h3>
        </div>
        <button type="button" onClick={() => void loadFleet()} disabled={refreshing}>
          <span className={refreshing ? "spin" : ""}>↻</span> {refreshing ? copy.loading : copy.reload}
        </button>
      </div>
      <div className="cost-note">{copy.history}</div>
      <FleetMap
        vessels={mappedVessels}
        legs={mappedLegs}
        tracks={legState.status === "ready" ? legState.tracks : []}
        pinnedLegId={pinnedLegId}
        replayAt={replayAt}
        language={language}
      />
      {legState.status === "ready" && <div className="replay-panel replay-panel-wide replay-under-map">
        <label className="replay-range"><span className="visually-hidden">{copy.raceClock}</span><input aria-label={copy.raceClock} type="range" min={0} max={Math.max(0, replayTimeline.length - 1)} value={Math.min(replayIndex, Math.max(0, replayTimeline.length - 1))} disabled={!pinnedLegId} onChange={(event) => setReplayIndex(Number(event.target.value))} /></label>
        <div className="replay-copy"><span className="section-number">02 / {copy.sharedTracker}</span><h3>{pinnedLegId ? mappedLegs.find((leg) => leg.id === pinnedLegId)?.name : copy.pinRace}</h3></div>
        <div className="replay-meta"><output>{replayAt ? `${new Date(replayAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC · ${language === "it" ? "TUTTE LE BARCHE" : "ALL BOATS"}` : copy.noRace}</output>{pinnedLegId && <button type="button" onClick={() => setPinnedLegId(null)}>{copy.unpinRace}</button>}</div>
      </div>}
      {legState.status === "error" && <div className="leaderboard-message error-card">{legState.message}</div>}
      {legState.status === "ready" && (
        <div className="regattas-section">
          <details className="regattas-dropdown">
            <summary><span className="section-number">03 / {copy.races.toUpperCase()} · {legState.races.length}</span><h3>{copy.races}</h3><i>⌄</i></summary>
            <div className="regatta-table" role="table" aria-label={copy.races}>
            <div className="regatta-row regatta-header" role="row"><span>{copy.status}</span><span>{copy.race}</span><span>{copy.startEnd}</span><span>{copy.arrivalOrder}</span><span /></div>
            {legState.races.map((race) => {
              const isLive = race.leg.status === "active";
              return <div className="regatta-row regatta-flat-row" role="row" key={race.leg.id}>
                  <span className={`race-status ${isLive ? "live" : "ended"}`}>{isLive ? copy.live : copy.ended}</span>
                  <strong>{race.leg.name}</strong>
                  <span className="regatta-times"><time>{new Date(race.leg.startsAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</time><time>{new Date(race.leg.endsAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</time></span>
                  <span className="compact-arrivals">{isLive ? copy.progress : race.results.map((result) => `${result.rank} ${result.name}`).join(" · ")}</span>
                  <button type="button" className={pinnedLegId === race.leg.id ? "is-pinned" : ""} onClick={() => togglePinnedRace(race.leg.id)}>{pinnedLegId === race.leg.id ? copy.unpin : copy.pin}</button>
              </div>;
            })}
            </div>
          </details>
        </div>
      )}
      <div className="detail-heading">
        <span className="section-number">04 / FIRST 36 FLEET</span>
        <h3>{copy.leaderboard}</h3>
      </div>
      {leaderboard.status === "loading" && <div className="leaderboard-message">{copy.loadingPoints}</div>}
      {leaderboard.status === "error" && <div className="leaderboard-message error-card">{copy.pointsUnavailable}</div>}
      {leaderboard.status === "ready" && (
        <div className="leaderboard" role="table" aria-label={`First 36 ${copy.leaderboard}`}>
          <div className="leaderboard-row leaderboard-header" role="row">
            <span>{copy.rank}</span><span>{copy.vessel}</span><span>{copy.lastReport}</span><span>{copy.totalPoints}</span>
          </div>
          {leaderboard.entries.map((entry, index) => {
            const state = states[entry.mmsi];
            return (
              <div className="leaderboard-row" role="row" key={entry.mmsi}>
                <strong className="leaderboard-rank">{String(index + 1).padStart(2, "0")}</strong>
                <span className="leaderboard-vessel"><i style={{ background: entry.color }} />{entry.name}</span>
                <span className="leaderboard-report">
                  {state?.status === "ready" ? (state.position.stale ? copy.staleAis : copy.aisReceived) : copy.reportUnavailable}
                </span>
                <strong className="leaderboard-points">{entry.totalPoints}<small> pts</small></strong>
              </div>
            );
          })}
        </div>
      )}
      <div className="reports-heading"><span className="section-number">05 / {copy.reports}</span><h3>{copy.telemetry}</h3></div>
      <div className="fleet-grid">
        {FLEET.map((vessel) => <VesselCard key={vessel.mmsi} vessel={vessel} state={states[vessel.mmsi]} language={language} />)}
      </div>
      {updatedAt && <p className="dashboard-time">{copy.checked} {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
    </section>
  );
}
