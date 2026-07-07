import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  const url = `${BASE_URL}/cards?search=${encodeURIComponent(query)}&limit=10`;

  const json = await fetchWithCache(url);
  if (json.error) {
    return NextResponse.json({ error: json.error, message: json.message }, { status: 429 });
  }
  return NextResponse.json(json);
}
