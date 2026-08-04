import { spawnSync } from "node:child_process";

const app = "first-mythos-cup-hermes";
const secretNames = [
  "OPENAI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_ALLOWED_USERS",
  "GFW_API_TOKEN",
];

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is missing from .env.local");
  process.exit(1);
}

const configured = secretNames.filter((name) => process.env[name]);
const missing = secretNames.filter((name) => !process.env[name]);
const payload = configured
  .map((name) => `${name}=${process.env[name]}`)
  .join("\n");

console.log(`Importing ${configured.length} named secrets into ${app}; values are hidden.`);
if (missing.length) {
  console.log(`Not configured: ${missing.join(", ")}`);
}

const result = spawnSync("fly", ["secrets", "import", "--app", app], {
  input: `${payload}\n`,
  stdio: ["pipe", "inherit", "inherit"],
});
process.exit(result.status ?? 1);
