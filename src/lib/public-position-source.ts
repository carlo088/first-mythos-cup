export const TIAMAT_MMSI = "240608700";

export function publicPositionSourceFilter(mmsi: string) {
  return mmsi === TIAMAT_MMSI
    ? "source=in.(myshiptracking,vesselapi)"
    : "source=eq.manual-reconstruction";
}

export const PUBLIC_TRACK_FILTERS = [
  "mmsi=in.(247520340,240576800)&source=eq.manual-reconstruction",
  `mmsi=eq.${TIAMAT_MMSI}&source=in.(myshiptracking,vesselapi)`,
] as const;
