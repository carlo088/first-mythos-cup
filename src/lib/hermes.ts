import { createHmac, timingSafeEqual } from "node:crypto";
import snapshot from "../../data/vessel-snapshot.json";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export interface HermesAnswer {
  answer: string;
  model: string;
  responseId: string | null;
}

export class HermesError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "HermesError";
  }
}

export function configuredHermesModel(): string {
  return process.env.HERMES_MODEL || "gpt-5.6-luna";
}

export function hermesAccessToken(openaiKey: string): string {
  return (
    process.env.HERMES_SERVICE_TOKEN ||
    createHmac("sha256", openaiKey)
      .update("first-mythos-cup:hermes:v1")
      .digest("hex")
  );
}

export function isAuthorizedHermesRequest(
  authorization: string | null,
  openaiKey: string,
): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7);
  const expected = hermesAccessToken(openaiKey);
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

function extractText(body: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}): string | undefined {
  if (body.output_text) return body.output_text;
  return body.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n");
}

function systemInstructions(): string {
  const fleet = snapshot.vessels
    .map(
      (vessel) =>
        `${vessel.vesselName} (MMSI ${vessel.mmsi}): ${vessel.lat}, ${vessel.lng}; last report ${vessel.receivedAt}`,
    )
    .join("\n");

  return `You are Hermes, the operations assistant for the First Mythos Cup.
Answer clearly and briefly. Treat vessel coordinates as saved, stale snapshots—not live navigation data.
Never claim that AIS is current. MyShipTracking calls are disabled to avoid credit costs.
Do not reveal, request, or repeat API keys, passwords, database URLs, or service tokens.
Current saved fleet snapshot (captured ${snapshot.capturedAt}):
${fleet}`;
}

export async function answerWithHermes(input: string): Promise<HermesAnswer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new HermesError("Hermes is not configured.", 503);

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: configuredHermesModel(),
        instructions: systemInstructions(),
        input,
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        max_output_tokens: 700,
        safety_identifier: "first-mythos-cup-owner",
        store: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new HermesError("The OpenAI service is currently unreachable.", 502);
  }

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new HermesError(
      body.error?.message || `OpenAI returned HTTP ${response.status}.`,
      response.status === 429 ? 429 : 502,
    );
  }

  const answer = extractText(body);
  if (!answer) throw new HermesError("Hermes returned no text.", 502);

  return {
    answer,
    model: configuredHermesModel(),
    responseId: body.id || null,
  };
}

