import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const set = searchParams.get("set") ?? "";
  const tcgPlayerId = searchParams.get("tcgPlayerId") ?? "";

  const params = new URLSearchParams();
  if (set) params.set("set", set);
  if (tcgPlayerId) params.set("tcgPlayerId", tcgPlayerId);
  params.set("limit", "20");

  const res = await fetch(
    "https://www.pokemonpricetracker.com/api/v2/sealed-products?" + params.toString(),
    {
      headers: {
        Authorization: "Bearer " + process.env.NEXT_PUBLIC_POKEPRICE_API_KEY,
      },
    }
  );

  const json = await res.json();
  return NextResponse.json(json);
}