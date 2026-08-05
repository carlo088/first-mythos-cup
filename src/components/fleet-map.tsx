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
              <path class="fleet-marker-shadow" d="M20 2 37 51 20 43 3 51 20 2Z" />
              <path class="fleet-marker-hull" d="M20 3 35 49 20 41 5 49 20 3Z" />
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
