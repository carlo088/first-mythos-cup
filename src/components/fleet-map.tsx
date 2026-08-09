"use client";

import { useEffect, useRef } from "react";
import { replayPoint, type ImportantLeg, type LegTrack } from "@/lib/important-leg";
import type { VesselPosition } from "@/lib/myshiptracking";
import type { FleetVessel } from "@/lib/vessels";
import type { Language } from "@/components/fleet-dashboard";
import { getVesselTrack } from "@/lib/vessel-direction";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type MappedVessel = { vessel: FleetVessel; position: VesselPosition };

function receivedLabel(receivedAt: string) {
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Athens", timeZoneName: "short",
  }).format(new Date(receivedAt));
}

function markerHtml(name: string, color: string, course: number | null, replay = false, language: Language = "en") {
  return `<span class="fleet-marker" style="--marker-color:${color}; --marker-course:${course ?? 0}deg" aria-label="${name} vessel marker">
    <svg viewBox="0 0 40 56" role="img" aria-hidden="true"><path class="fleet-marker-shadow" d="M20 2 36 50 20 42 4 50 20 2Z"/><path class="fleet-marker-hull" d="M20 4 33 46 20 39 7 46 20 4Z"/></svg>
  </span><strong>${name}${replay ? ` · ${language === "it" ? "RIPRODUZIONE" : "REPLAY"}` : ""}</strong>`;
}

function endpointFlagHtml(letter: "S" | "E", color: string, label: string) {
  return `<span class="race-flag" style="--flag-color:${color}" aria-label="${label}"><span class="race-flag-pole"></span><span class="race-flag-cloth">${letter}</span></span>`;
}

export function FleetMap({
  vessels,
  legs = [],
  tracks = [],
  liveTracks = [],
  pinnedLegId,
  replayAt,
  language,
}: {
  vessels: MappedVessel[];
  legs?: ImportantLeg[];
  tracks?: LegTrack[];
  liveTracks?: LegTrack[];
  pinnedLegId?: string | null;
  replayAt?: string;
  language: Language;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef(new Map<string, LeafletMarker>());

  useEffect(() => {
    let active = true;
    let removeMap: (() => void) | undefined;
    void import("leaflet").then((leaflet) => {
      if (!active || !containerRef.current) return;
      const map = leaflet.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
      mapRef.current = map;
      markerRefs.current.clear();
      removeMap = () => map.remove();
      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(map);
      const bounds = leaflet.latLngBounds([]);

      for (const leg of legs) {
        const pinned = leg.id === pinnedLegId;
        const route: [number, number][] = [[leg.start.lat, leg.start.lng], ...leg.checkpoints.map((checkpoint) => [checkpoint.lat, checkpoint.lng] as [number, number]), [leg.end.lat, leg.end.lng]];
        route.forEach((point) => bounds.extend(point));
        leaflet.polyline(route, { color: pinned ? "#009bc4" : "#071a2b", weight: pinned ? 4 : 2, dashArray: pinned ? undefined : "3 8", opacity: pinned ? 1 : 0.55 }).addTo(map);
        const startLabel = language === "it" ? "PARTENZA" : "START";
        const finishLabel = language === "it" ? "ARRIVO" : "FINISH";
        leaflet.marker(route[0], { icon: leaflet.divIcon({ className: "race-flag-wrap", html: endpointFlagHtml("S", "#071a2b", startLabel), iconSize: [22, 28], iconAnchor: [4, 27] }) }).addTo(map).bindTooltip(`${leg.name} · ${startLabel}`);
        leaflet.marker(route[route.length - 1], { icon: leaflet.divIcon({ className: "race-flag-wrap", html: endpointFlagHtml("E", "#009bc4", finishLabel), iconSize: [22, 28], iconAnchor: [4, 27] }) }).addTo(map).bindTooltip(`${leg.name} · ${finishLabel}`);
        for (const point of route.slice(1, -1)) {
          leaflet.circleMarker(point, { radius: 6, color: "#e08b32", fillColor: "#f4f0e7", fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip(`${leg.name} · CHECKPOINT`);
        }
      }

      for (const track of tracks) {
        for (let index = 1; index < track.points.length; index += 1) {
          const previous = track.points[index - 1];
          const current = track.points[index];
          const inLeg = Boolean(previous.legId && previous.legId === current.legId);
          const segment: [number, number][] = [[previous.lat, previous.lng], [current.lat, current.lng]];
          segment.forEach((point) => bounds.extend(point));
          leaflet.polyline(segment, {
            color: track.color,
            weight: inLeg ? 4 : 2,
            opacity: inLeg ? 0.92 : 0.45,
            dashArray: inLeg ? undefined : "4 8",
          }).addTo(map);
        }
      }

      for (const track of liveTracks) {
        const points = [...track.points].sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
        for (let index = 1; index < points.length; index += 1) {
          const previous = points[index - 1];
          const current = points[index];
          const segment: [number, number][] = [[previous.lat, previous.lng], [current.lat, current.lng]];
          segment.forEach((point) => bounds.extend(point));
          leaflet.polyline(segment, {
            color: track.color,
            weight: 5,
            opacity: 0.9,
            dashArray: "10 9",
          }).addTo(map);
        }
      }

      for (const { vessel, position } of vessels) {
        const replayTrack = tracks.find((track) => track.mmsi === vessel.mmsi);
        const isReplay = Boolean(pinnedLegId && replayAt && replayTrack?.points.some((candidate) => candidate.legId === pinnedLegId));
        const selectedReplayPoint = isReplay && replayAt && replayTrack ? replayPoint(replayTrack, pinnedLegId!, replayAt) : undefined;
        // Live cards and markers must use the same authoritative position. The
        // vessel endpoint may prefer a fresh provider report or a manual
        // fallback, so independently choosing liveTrack's last point can
        // place the marker away from the rendered track/card position.
        const point = selectedReplayPoint ?? position;
        const lat = point.lat;
        const lng = point.lng;
        bounds.extend([lat, lng]);
        const direction = point?.course !== null && point?.course !== undefined
          ? point.course
          : getVesselTrack(position).bearing;
        const icon = leaflet.divIcon({
          className: "fleet-marker-wrap",
          html: markerHtml(vessel.name, vessel.color, point?.course ?? direction, isReplay, language),
          iconAnchor: [20, 28],
          iconSize: [40, 56],
        });
        const marker = leaflet.marker([lat, lng], { icon }).addTo(map).bindPopup(
          `<b>${vessel.name}</b><br>${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E<br>${language === "it" ? "Ricevuto" : "Received"} ${receivedLabel(point?.receivedAt ?? position.receivedAt)}`,
        );
        markerRefs.current.set(vessel.mmsi, marker);
      }
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.16), { maxZoom: 13 });
      else map.setView([37.54, 24.16], 10);
    });
    return () => {
      active = false;
      markerRefs.current.clear();
      mapRef.current = null;
      removeMap?.();
    };
  }, [language, legs, liveTracks, pinnedLegId, tracks, vessels]);

  useEffect(() => {
    if (!pinnedLegId || !replayAt || !mapRef.current) return;
    for (const track of tracks) {
      const point = replayPoint(track, pinnedLegId, replayAt);
      const marker = markerRefs.current.get(track.mmsi);
      if (point && marker) marker.setLatLng([point.lat, point.lng]);
    }
  }, [pinnedLegId, replayAt, tracks]);

  return (
    <div className="fleet-map-shell">
      <div ref={containerRef} className="fleet-map" aria-label="Prima Regatina route and recorded fleet tracks" />
      {!pinnedLegId && <div className="fleet-map-legend">
        {tracks.map((track) => <div key={track.mmsi}><i style={{ background: track.color }} /><span>{track.name}</span><time>{track.points.length} {language === "it" ? "rapporti" : "reports"}</time></div>)}
        <div className="track-key"><i /><span>{language === "it" ? "Tratteggiata" : "Dashed"}</span><time>{language === "it" ? "fuori regata" : "outside leg"}</time></div>
        <div className="track-key solid"><i /><span>{language === "it" ? "Continua" : "Solid"}</span><time>{language === "it" ? "in regata" : "in regatta"}</time></div>
      </div>}
    </div>
  );
}
