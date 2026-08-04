import { spawnSync } from "node:child_process";

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) {
  console.error("SUPABASE_DATABASE_URL is missing from .env.local");
  process.exit(1);
}

const directUrl = new URL(databaseUrl);
const projectRef = directUrl.hostname.split(".")[1];
const poolerHost = process.env.SUPABASE_POOLER_HOST;
if (!projectRef || !poolerHost) {
  console.error("SUPABASE_POOLER_HOST or project reference is missing");
  process.exit(1);
}
const poolerUrl = new URL(databaseUrl);
poolerUrl.username = `postgres.${projectRef}`;
poolerUrl.hostname = poolerHost;
poolerUrl.port = "5432";

const result = spawnSync(
  "npx",
  ["--yes", "supabase@latest", "db", "push", "--db-url", poolerUrl.toString()],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
