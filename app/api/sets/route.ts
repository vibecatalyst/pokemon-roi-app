import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET() {
  const allSets: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${BASE_URL}/sets?sortBy=releaseDate&sortOrder=desc&limit=${limit}&offset=${offset}`;
    const json = await fetchWithCache(url) as { data?: Record<string, unknown>[]; metadata?: { hasMore?: boolean } };
    const data = json.data ?? [];
    allSets.push(...data);

    if (!json.metadata?.hasMore || data.length === 0) break;
    offset += limit;

    // Safety cap at 300 sets to avoid infinite loops
    if (allSets.length >= 300) break;
  }

  return NextResponse.json({ data: allSets });
}
