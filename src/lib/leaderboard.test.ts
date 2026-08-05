import { describe, expect, it } from "vitest";
import { sortLeaderboard, type LeaderboardEntry } from "./leaderboard";

const entries: LeaderboardEntry[] = [
  { name: "Isera", mmsi: "247520340", color: "#ff7a45", totalPoints: 0 },
  { name: "Fizzy", mmsi: "240576800", color: "#46d6bd", totalPoints: 12 },
  { name: "Tiamat", mmsi: "240608700", color: "#73a7ff", totalPoints: 12 },
];

describe("leaderboard", () => {
  it("sorts by total points and uses vessel name as the tie-breaker", () => {
    expect(sortLeaderboard(entries).map((entry) => [entry.name, entry.totalPoints])).toEqual([
      ["Fizzy", 12],
      ["Tiamat", 12],
      ["Isera", 0],
    ]);
  });

  it("does not mutate the source entries", () => {
    expect(sortLeaderboard(entries)).not.toBe(entries);
  });
});
