import { NextResponse } from "next/server";
import {
  answerWithHermes,
  configuredHermesModel,
  HermesError,
  isAuthorizedHermesRequest,
} from "@/lib/hermes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "hermes",
    model: configuredHermesModel(),
    vesselDataMode: process.env.VESSEL_DATA_MODE || "mock",
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Hermes is not configured." }, { status: 503 });
  }
  if (!isAuthorizedHermesRequest(request.headers.get("authorization"), apiKey)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let input: unknown;
  try {
    input = (await request.json() as { input?: unknown }).input;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (typeof input !== "string" || input.trim().length === 0 || input.length > 4_000) {
    return NextResponse.json(
      { error: "Input must be between 1 and 4,000 characters." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ data: await answerWithHermes(input.trim()) });
  } catch (error) {
    const hermesError =
      error instanceof HermesError
        ? error
        : new HermesError("Hermes could not answer the request.");
    return NextResponse.json(
      { error: hermesError.message },
      { status: hermesError.statusCode },
    );
  }
}

