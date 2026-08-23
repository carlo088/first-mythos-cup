"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { reconstructTrack, type ReconstructedPoint } from "@/lib/track-reconstruction";
import { FLEET } from "@/lib/vessels";

type Coordinate = { lat: number; lng: number };
type StoredPoint = Coordinate & { id: number; received_at: string; source: string; reconstruction_id?: string | null };

function localInput(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

function RepairMap({ existing, controls, preview, onAdd, onMove }: { existing: StoredPoint[]; controls: Coordinate[]; preview: ReconstructedPoint[]; onAdd(point: Coordinate): void; onMove(index: number, point: Coordinate): void }) {
  const container = useRef<HTMLDivElement>(null); const mapRef = useRef<LeafletMap | null>(null); const baseLayer = useRef<LayerGroup | null>(null); const editLayer = useRef<LayerGroup | null>(null); const addRef = useRef(onAdd);
  useEffect(() => { addRef.current = onAdd; }, [onAdd]);
  useEffect(() => {
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !container.current) return;
      const map = L.map(container.current, { scrollWheelZoom: true }).setView([37.6, 24.1], 8); mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
      baseLayer.current = L.layerGroup().addTo(map); editLayer.current = L.layerGroup().addTo(map);
      map.on("click", (event) => addRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }));
    });
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => {
    if (!mapRef.current || !baseLayer.current) return; const map = mapRef.current; const layer = baseLayer.current; layer.clearLayers();
    void import("leaflet").then((L) => {
      if (existing.length > 1) L.polyline(existing.map((p) => [p.lat, p.lng]), { color: "#718392", weight: 3, dashArray: "5 8", opacity: .7 }).addTo(layer);
      existing.forEach((p) => L.circleMarker([p.lat, p.lng], { radius: 3, color: p.source === "manual-reconstruction" ? "#009bc4" : "#071a2b", weight: 1, fillOpacity: .8 }).bindTooltip(`${new Date(p.received_at).toLocaleString()} · ${p.source}`).addTo(layer));
      const bounds = L.latLngBounds(existing.map((p) => [p.lat, p.lng] as [number, number])); if (bounds.isValid()) map.fitBounds(bounds.pad(.15), { maxZoom: 13 });
    });
  }, [existing]);
  useEffect(() => {
    if (!editLayer.current) return; const layer = editLayer.current; layer.clearLayers();
    void import("leaflet").then((L) => {
      if (preview.length > 1) L.polyline(preview.map((p) => [p.lat, p.lng]), { color: "#00a6c7", weight: 5, opacity: .9 }).addTo(layer);
      controls.forEach((point, index) => {
        const marker = L.marker([point.lat, point.lng], { draggable: true, icon: L.divIcon({ className: "repair-control", html: String(index + 1), iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(layer);
        marker.on("dragend", () => { const p = marker.getLatLng(); onMove(index, { lat: p.lat, lng: p.lng }); });
      });
    });
  }, [controls, onMove, preview]);
  return <div ref={container} className="repair-map" aria-label="Track reconstruction map" />;
}

export function TrackRepairEditor() {
  const now = new Date(); const earlier = new Date(now.getTime() - 24 * 3600000);
  const [mmsi, setMmsi] = useState<string>(FLEET[0].mmsi); const [from, setFrom] = useState(localInput(earlier)); const [to, setTo] = useState(localInput(now));
  const [existing, setExisting] = useState<StoredPoint[]>([]); const [controls, setControls] = useState<Coordinate[]>([]); const [note, setNote] = useState(""); const [message, setMessage] = useState("Load a time range, then click the map in sailing order."); const [saving, setSaving] = useState(false);
  const preview = useMemo(() => { try { return controls.length > 1 ? reconstructTrack(controls, new Date(from).toISOString(), new Date(to).toISOString()) : []; } catch { return []; } }, [controls, from, to]);
  const maxSpeed = preview.reduce((max, point) => Math.max(max, point.speedKnots), 0);
  async function load() { setMessage("Loading recorded positions…"); const response = await fetch(`/api/track-repair?mmsi=${mmsi}&from=${encodeURIComponent(new Date(from).toISOString())}&to=${encodeURIComponent(new Date(to).toISOString())}`); const body = await response.json(); if (!response.ok) return setMessage(body.error); setExisting(body.data.map((p: { id: number; latitude: number; longitude: number; received_at: string; source: string; reconstruction_id?: string | null }) => ({ id: p.id, lat: p.latitude, lng: p.longitude, received_at: p.received_at, source: p.source, reconstruction_id: p.reconstruction_id }))); setMessage(`${body.data.length} recorded positions loaded. Click the intended route in order.`); }
  function move(index: number, point: Coordinate) { setControls((current) => current.map((p, i) => i === index ? point : p)); }
  async function save() { if (controls.length < 2) return; if (!window.confirm(`Save ${preview.length} reconstructed positions? Original reports will remain untouched.`)) return; setSaving(true); const response = await fetch("/api/track-repair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mmsi, startsAt: new Date(from).toISOString(), endsAt: new Date(to).toISOString(), controlPoints: controls, note }) }); const body = await response.json(); setSaving(false); if (!response.ok) return setMessage(body.error); setMessage(`Saved ${body.data.generated} reconstructed positions. Reload the range to inspect them.`); setControls([]); await load(); }
  return <main className="repair-page"><header className="repair-header"><span>FIRST MYTHOS CUP / LOCAL ADMIN</span><h1>Track repair</h1><p>Reconstruct regatta and non-regatta sailing without modifying original AIS reports. Use one missing sailing interval at a time.</p></header><section className="repair-controls"><label>Vessel<select value={mmsi} onChange={(e) => setMmsi(e.target.value)}>{FLEET.filter((v) => v.name !== "Tiamat").map((v) => <option value={v.mmsi} key={v.mmsi}>{v.name}</option>)}</select></label><label>Start<input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>End<input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></label><button type="button" onClick={() => void load()}>Load track</button></section><RepairMap existing={existing} controls={controls} preview={preview} onAdd={(point) => setControls((current) => [...current, point])} onMove={move} /><section className="repair-toolbar"><div><strong>{controls.length} control points · {preview.length} generated reports</strong><span>Maximum estimated speed: {maxSpeed.toFixed(1)} kn{preview.length > 1000 ? " · shorten the interval" : ""}</span></div><label>Notes<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where this route came from" /></label><div className="repair-actions"><button type="button" onClick={() => setControls((p) => p.slice(0, -1))} disabled={!controls.length}>Undo point</button><button type="button" onClick={() => setControls([])} disabled={!controls.length}>Clear</button><button type="button" className="primary" onClick={() => void save()} disabled={saving || controls.length < 2 || maxSpeed > 35 || preview.length > 1000}>{saving ? "Saving…" : "Save reconstruction"}</button></div><p>{message}</p></section></main>;
}
