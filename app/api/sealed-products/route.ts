import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const set = searchParams.get("set") ?? "";
  const tcgPlayerId = searchParams.get("tcgPlayerId") ?? "";
  const includeHistory = searchParams.get("includeHistory") ?? "";

  const params = new URLSearchParams();
  if (set) params.set("set", set);
  if (tcgPlayerId) params.set("tcgPlayerId", tcgPlayerId);
  if (includeHistory) params.set("includeHistory", includeHistory);
  params.set("limit", "50");

  const url = "https://www.pokemonpricetracker.com/api/v2/sealed-products?" + params.toString();
  const json = await fetchWithCache(url);
  return NextResponse.json(json);
}
