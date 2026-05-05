import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.NEXT_PUBLIC_POKEPRICE_API_KEY!;
const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET(req: NextRequest) {
  const setName = req.nextUrl.searchParams.get("set") ?? "";
  const url = `${BASE_URL}/cards?set=${encodeURIComponent(setName)}&fetchAllInSet=true&includeEbay=true`;

  console.log("Fetching set:", setName);
  console.log("API Key present:", !!API_KEY);
  console.log("URL:", url);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  const json = await res.json();
  console.log("Response error:", json.error);
  console.log("Data length:", json.data?.length);
  console.log("First card ebay:", JSON.stringify(json.data?.[0]?.ebay));

  if (json.error) {
    return NextResponse.json({ error: json.error, message: json.message }, { status: 429 });
  }
  return NextResponse.json(json);
}