import { createHmac } from "node:crypto";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY is missing from .env.local");
  process.exit(1);
}

const token =
  process.env.HERMES_SERVICE_TOKEN ||
  createHmac("sha256", apiKey)
    .update("first-mythos-cup:hermes:v1")
    .digest("hex");

console.log(token);

