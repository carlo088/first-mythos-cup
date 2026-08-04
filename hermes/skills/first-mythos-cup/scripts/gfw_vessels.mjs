#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const BASE_URL = "https://gateway.api.globalfishingwatch.org/v3/vessels";
const DATASET = "public-global-vessel-identity:latest";
const SAFE_QUERY = /^[A-Za-z0-9 ._+/'-]{1,120}$/;
const SAFE_VESSEL_ID = /^[A-Za-z0-9_-]{1,160}$/;

export function searchUrl(query, limit = 10) {
  if (!SAFE_QUERY.test(query)) throw new Error("query must be 1-120 safe vessel-identity characters");
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("limit must be between 1 and 50");
  const parameters = new URLSearchParams({ query, "datasets[0]": DATASET, limit: String(limit) });
  return `${BASE_URL}/search?${parameters}`;
}

export function resolveUrl(vesselId) {
  if (!SAFE_VESSEL_ID.test(vesselId)) throw new Error("invalid vessel ID");
  const parameters = new URLSearchParams({ dataset: DATASET });
  return `${BASE_URL}/${encodeURIComponent(vesselId)}?${parameters}`;
}

function parseArguments(argv) {
  const [command, value, flag, rawLimit] = argv;
  if (!command || !value || !["search", "resolve"].includes(command)) {
    throw new Error("usage: gfw_vessels.mjs search QUERY [--limit N] | resolve VESSEL_ID");
  }
  if (command === "resolve") return { command, value };
  if (flag && flag !== "--limit") throw new Error("only --limit is supported");
  const limit = rawLimit === undefined ? 10 : Number(rawLimit);
  return { command, value, limit };
}

export async function main(argv = process.argv.slice(2), environment = process.env) {
  const token = environment.GFW_API_TOKEN?.trim();
  if (!token) {
    console.error("GFW_API_TOKEN is not configured");
    return 2;
  }
  try {
    const args = parseArguments(argv);
    const url = args.command === "search" ? searchUrl(args.value, args.limit) : resolveUrl(args.value);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error(`Global Fishing Watch returned HTTP ${response.status}`);
      return 1;
    }
    console.log(JSON.stringify(await response.json(), null, 2));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Global Fishing Watch request failed");
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
