#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const KNOWN_MMSIS = new Set(["247520340", "240576800", "240608700"]);
const ENDPOINT = "https://api.myshiptracking.com/api/v2/vessel";

export function validatePaidRequest(mmsi, spendCredit) {
  if (!KNOWN_MMSIS.has(mmsi)) throw new Error("MMSI is not in the First Mythos Cup fleet");
  if (!spendCredit) throw new Error("refusing paid request without --spend-credit");
}

export function normalizePayload(payload) {
  const data = { ...(payload.data || {}) };
  if (data.course === 511) data.course = null;
  return { status: payload.status, data };
}

export async function main(argv = process.argv.slice(2), environment = process.env) {
  const [mmsi, ...flags] = argv;
  try {
    validatePaidRequest(mmsi, flags.includes("--spend-credit"));
    if (flags.some((flag) => flag !== "--spend-credit")) throw new Error("unsupported argument");
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  const key = environment.MYSHIPTRACKING_API_KEY?.trim();
  if (!key) {
    console.error("MYSHIPTRACKING_API_KEY is not configured");
    return 2;
  }

  const parameters = new URLSearchParams({ mmsi, response: "simple" });
  try {
    const response = await fetch(`${ENDPOINT}?${parameters}`, {
      headers: { "x-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error(`MyShipTracking returned HTTP ${response.status}`);
      return 1;
    }
    console.log(JSON.stringify(normalizePayload(await response.json()), null, 2));
    return 0;
  } catch (error) {
    console.error(`MyShipTracking request failed: ${error?.name || "Error"}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
