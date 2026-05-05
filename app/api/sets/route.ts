import { NextResponse } from "next/server";

const API_KEY = process.env.NEXT_PUBLIC_POKEPRICE_API_KEY!;
const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET() {
  const res = await fetch(`${BASE_URL}/sets?sortBy=releaseDate&sortOrder=desc&limit=50`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const json = await res.json();
  return NextResponse.json(json);
}
