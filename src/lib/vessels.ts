export const FLEET = [
  { name: "Isera", mmsi: "247520340", color: "#ff7a45" },
  { name: "Fizzy", mmsi: "240576800", color: "#46d6bd" },
  { name: "Tiamat", mmsi: "240608700", color: "#73a7ff" },
] as const;

export type FleetVessel = (typeof FLEET)[number];

export function isKnownMmsi(value: string): boolean {
  return /^\d{9}$/.test(value) && FLEET.some((vessel) => vessel.mmsi === value);
}

export function fleetVessel(value: string): FleetVessel | undefined {
  return FLEET.find((vessel) => vessel.mmsi === value);
}

