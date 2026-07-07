import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET(req: NextRequest) {
  const setName = req.nextUrl.searchParams.get("set") ?? "";
  const url = `${BASE_URL}/cards?set=${encodeURIComponent(setName)}&fetchAllInSet=true&includeEbay=true`;

  const json = await fetchWithCache(url);
  if (json.error) {
    return NextResponse.json({ error: json.error, message: json.message }, { status: 429 });
  }
  return NextResponse.json(json);
}
