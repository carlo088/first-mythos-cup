export type LivePositionRow = {
  received_at: string;
  source: string;
};

const STALE_AFTER_SECONDS = 15 * 60;

function isStale(receivedAt: string, now: Date) {
  return (now.getTime() - Date.parse(receivedAt)) / 1000 > STALE_AFTER_SECONDS;
}

export function selectLivePositionRow<T extends LivePositionRow>(rows: T[], now = new Date()) {
  const providerRow = rows.find((row) => row.source === "myshiptracking");
  const manualRow = rows.find((row) => row.source === "manual-user");

  if (!providerRow || isStale(providerRow.received_at, now)) return manualRow ?? providerRow;
  return providerRow;
}
