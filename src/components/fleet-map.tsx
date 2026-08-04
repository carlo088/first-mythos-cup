"use client";

import { useEffect, useRef } from "react";
import type { VesselPosition } from "@/lib/myshiptracking";
import type { FleetVessel } from "@/lib/vessels";

export type MappedVessel = {
  vessel: FleetVessel;
  position: VesselPosition;
};

function receivedLabel(receivedAt: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(receivedAt));
}

export function FleetMap({ vessels }: { vessels: MappedVessel[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let removeMap: (() => void) | undefined;

    void import("leaflet").then((leaflet) => {
      if (!active || !containerRef.current) return;

      const map = leaflet.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      });
      removeMap = () => map.remove();

      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (!vessels.length) {
        map.setView([37.8, 23.9], 9);
        return;
      }

      const bounds = leaflet.latLngBounds([]);
      for (const { vessel, position } of vessels) {
        const coordinates: [number, number] = [position.lat, position.lng];
        bounds.extend(coordinates);
        const course = position.course ?? 0;
        const icon = leaflet.divIcon({
          className: "fleet-marker-wrap",
          html: `<span class="fleet-marker" style="--marker-color:${vessel.color}; --marker-course:${course}deg" aria-label="${vessel.name} vessel marker">
            <svg viewBox="0 0 40 56" role="img" aria-hidden="true" focusable="false">
              <path class="fleet-marker-shadow" d="M20 2 35 39c-3 10-9 15-15 15S8 49 5 39L20 2Z" />
              <path class="fleet-marker-hull" d="M20 2 34 39c-3 7-8 11-14 11S9 46 6 39L20 2Z" />
              <path class="fleet-marker-cabin" d="m13 31 7-9 7 9-3 4h-8l-3-4Z" />
              <path class="fleet-marker-wake" d="M11 45c3 3 5 4 9 4s6-1 9-4" />
            </svg>
          </span><strong>${vessel.name}</strong>`,
          iconAnchor: [20, 28],
        });
        leaflet.marker(coordinates, { icon })
          .addTo(map)
          .bindPopup(
            `<b>${vessel.name}</b><br>${position.lat.toFixed(5)}° N, ${position.lng.toFixed(5)}° E<br>` +
              `Received ${receivedLabel(position.receivedAt)}${position.stale ? " · stale" : ""}`,
          );
      }
      map.fitBounds(bounds.pad(0.28), { maxZoom: 13 });
    });

    return () => {
      active = false;
      removeMap?.();
    };
  }, [vessels]);

  return (
    <div className="fleet-map-shell">
      <div ref={containerRef} className="fleet-map" aria-label="Map of the fleet's last known positions" />
      <div className="fleet-map-legend">
        {vessels.length ? vessels.map(({ vessel, position }) => (
          <div key={vessel.mmsi}>
            <i style={{ background: vessel.color }} />
            <span>{vessel.name}</span>
            <time dateTime={position.receivedAt}>{receivedLabel(position.receivedAt)}</time>
          </div>
        )) : <span>Loading saved vessel positions…</span>}
      </div>
    </div>
  );
}
