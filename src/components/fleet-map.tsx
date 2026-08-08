"use client";

import { useEffect, useRef } from "react";
import type { ImportantLeg, LegTrack } from "@/lib/important-leg";
import type { VesselPosition } from "@/lib/myshiptracking";
import type { FleetVessel } from "@/lib/vessels";
import type { Language } from "@/components/fleet-dashboard";
import { getVesselTrack } from "@/lib/vessel-direction";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type MappedVessel = { vessel: FleetVessel; position: VesselPosition };

function receivedLabel(receivedAt: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(receivedAt));
}

function markerHtml(name: string, color: string, course: number | null, replay = false, language: Language = "en") {
  return `<span class="fleet-marker" style="--marker-color:${color}; --marker-course:${course ?? 0}deg" aria-label="${name} vessel marker">
    <svg viewBox="0 0 40 56" role="img" aria-hidden="true"><path class="fleet-marker-shadow" d="M20 2 36 50 20 42 4 50 20 2Z"/><path class="fleet-marker-hull" d="M20 4 33 46 20 39 7 46 20 4Z"/></svg>
  </span><strong>${name}${replay ? ` · ${language === "it" ? "RIPRODUZIONE" : "REPLAY"}` : ""}</strong>`;
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
        const route: [number, number][] = [[leg.start.lat, leg.start.lng], [leg.end.lat, leg.end.lng]];
        route.forEach((point) => bounds.extend(point));
        leaflet.polyline(route, { color: pinned ? "#009bc4" : "#071a2b", weight: pinned ? 4 : 2, dashArray: pinned ? undefined : "3 8", opacity: pinned ? 1 : 0.55 }).addTo(map);
        leaflet.circleMarker(route[0], { radius: 7, color: "#071a2b", fillColor: "#f4f0e7", fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip(`${leg.name} · ${language === "it" ? "PARTENZA" : "START"}`);
        leaflet.circleMarker(route[1], { radius: 7, color: "#009bc4", fillColor: "#f4f0e7", fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip(`${leg.name} · ${language === "it" ? "ARRIVO" : "FINISH"}`);
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
        for (let index = 1; index < track.points.length; index += 1) {
          const previous = track.points[index - 1];
          const current = track.points[index];
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
        const racePoints = pinnedLegId ? replayTrack?.points.filter((candidate) => candidate.legId === pinnedLegId) ?? [] : [];
        const eligiblePoints = replayAt ? racePoints.filter((candidate) => Date.parse(candidate.receivedAt) <= Date.parse(replayAt)) : racePoints;
        const isReplay = Boolean(pinnedLegId && replayAt && racePoints.length);
        const point = isReplay ? eligiblePoints[eligiblePoints.length - 1] ?? racePoints[0] : null;
        const lat = point?.lat ?? position.lat;
        const lng = point?.lng ?? position.lng;
        bounds.extend([lat, lng]);
        const direction = point?.course !== null && point?.course !== undefined
          ? point.course
          : getVesselTrack(position).bearing;
        const icon = leaflet.divIcon({
          className: "fleet-marker-wrap",
          html: markerHtml(vessel.name, vessel.color, point?.course ?? direction, isReplay, language),
          iconAnchor: [20, 28],
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
      const racePoints = track.points.filter((point) => point.legId === pinnedLegId);
      const eligible = racePoints.filter((point) => Date.parse(point.receivedAt) <= Date.parse(replayAt));
      const point = eligible[eligible.length - 1] ?? racePoints[0];
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
