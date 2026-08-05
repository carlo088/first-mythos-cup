import type { FleetVessel } from "./vessels";

export type LeaderboardEntry = FleetVessel & { totalPoints: number };

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) =>
    b.totalPoints - a.totalPoints || a.name.localeCompare(b.name),
  );
}
