import { NextResponse } from "next/server";
import { supabaseConfig } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type LibraryBook = {
  id: string;
  reader_name: string;
  title: string;
  author: string;
  summary: string;
  created_at: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validSummary(summary: string) {
  return summary.length > 0 && summary.length <= 700 && summary.split("\n").length <= 4;
}

export async function GET() {
  try {
    const { url, key } = supabaseConfig();
    const response = await fetch(`${url}/rest/v1/library_books?select=id,reader_name,title,author,summary,created_at&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Library unavailable");
    return NextResponse.json({ data: (await response.json()) as LibraryBook[] });
  } catch {
    return NextResponse.json({ error: "Library unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const readerName = clean(body.readerName);
    const title = clean(body.title);
    const author = clean(body.author);
    const summary = clean(body.summary);
    if (readerName.length < 1 || readerName.length > 80 || title.length < 1 || title.length > 160 || author.length < 1 || author.length > 120 || !validSummary(summary)) {
      return NextResponse.json({ error: "Inserisci nome, titolo, autore e un riassunto di massimo quattro righe." }, { status: 400 });
    }

    const { url, key } = supabaseConfig();
    const response = await fetch(`${url}/rest/v1/library_books`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ reader_name: readerName, title, author, summary }),
    });
    if (!response.ok) throw new Error("Library unavailable");
    const rows = await response.json() as LibraryBook[];
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossibile salvare il libro." }, { status: 503 });
  }
}
