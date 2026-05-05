import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.NEXT_PUBLIC_POKEPRICE_API_KEY!;
const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const url = `${BASE_URL}/cards?tcgPlayerId=${id}&includeEbay=true&maxDataPoints=90`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  const json = await res.json();
  if (json.error) {
    return NextResponse.json({ error: json.error, message: json.message }, { status: 429 });
  }
  return NextResponse.json(json);
}