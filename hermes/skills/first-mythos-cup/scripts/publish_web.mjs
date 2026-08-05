#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
}

export function selectDeployment(deployments, commitSha) {
  return deployments.find((deployment) => deployment?.meta?.githubCommitSha === commitSha) ?? null;
}

export function assertPublishableCheckout(status, branch) {
  if (status.trim()) throw new Error("Checkout is dirty; commit the focused changes before publishing.");
  if (branch.trim() !== "main") throw new Error(`Refusing to publish branch ${branch.trim() || "unknown"}; expected main.`);
}

async function vercelRequest(path) {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_ORG_ID;
  if (!token || !teamId) throw new Error("VERCEL_TOKEN and VERCEL_ORG_ID are required.");
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://api.vercel.com${path}${separator}teamId=${encodeURIComponent(teamId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Vercel API returned HTTP ${response.status}.`);
  return response.json();
}

async function waitForProduction(commitSha, timeoutMs = 360_000) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is required.");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await vercelRequest(`/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=20`);
    const deployment = selectDeployment(data.deployments ?? [], commitSha);
    if (deployment?.state === "READY") return deployment;
    if (["ERROR", "CANCELED"].includes(deployment?.state)) {
      throw new Error(`Vercel deployment ${deployment.uid} ended in ${deployment.state}.`);
    }
    await sleep(5_000);
  }
  throw new Error(`Timed out waiting for Vercel deployment of ${commitSha.slice(0, 7)}.`);
}

async function checkUrl(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
}

export async function main() {
  const status = git("status", "--porcelain");
  const branch = git("branch", "--show-current");
  assertPublishableCheckout(status, branch);
  const commitSha = git("rev-parse", "HEAD");

  git("push", "origin", "main");
  const deployment = await waitForProduction(commitSha);

  const appUrl = (process.env.APP_URL || "https://first-mythos-cup.vercel.app").replace(/\/$/, "");
  await Promise.all([
    checkUrl(appUrl),
    checkUrl(`${appUrl}/api/vessels/240576800`),
    checkUrl(`${appUrl}/api/leaderboard`),
  ]);

  console.log(`Published ${commitSha.slice(0, 7)}; Vercel ${deployment.uid} is READY; app and APIs returned success.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
